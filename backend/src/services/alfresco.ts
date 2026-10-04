import axios from 'axios';
import FormData from 'form-data';
import * as fs from 'fs/promises';
import { Readable } from 'stream';
import { AlfrescoDocument, Document } from '../types/index.js';

export interface AlfrescoNodeEntry {
  entry: AlfrescoNode;
}

export interface AlfrescoNode {
  id: string;
  name: string;
  createdAt: string;
  modifiedAt: string;
  folderId?: string;
  createdByUser?: { id: string; displayName: string };
  modifiedByUser?: { id: string; displayName: string };
  content?: { mimeType: string; sizeInBytes: number };
  properties?: Record<string, unknown>;
  path?: { name: string; elements?: { id: string; name: string }[] };
  search?: { highlight?: { field: string; snippets: string[] }[] };
}

export interface AlfrescoSearchResult {
  documents: AlfrescoDocument[];
  totalItems: number;
}

export class AlfrescoError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export interface AlfrescoExportResult {
  success: boolean;
  nodeId: string;
  filename: string;
  location: string;
  message: string;
}

function describeError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return `${error.response?.status ?? 'N/A'} ${error.response?.statusText || error.message}`;
  }
  return error instanceof Error ? error.message : String(error);
}

export interface AlfrescoConfig {
  baseUrl: string;
  username: string;
  password: string;
  // Site whose documentLibrary is used for export and browsing (default "demo")
  site?: string;
  // Search API endpoint; derived from baseUrl when omitted
  searchUrl?: string;
}

// Reads the Alfresco settings from the environment, or null when they're incomplete.
export function loadAlfrescoConfig(): AlfrescoConfig | null {
  const baseUrl = process.env.ALFRESCO_URL;
  const username = process.env.ALFRESCO_USERNAME;
  const password = process.env.ALFRESCO_PASSWORD;
  if (!baseUrl || !username || !password) return null;
  return {
    baseUrl: baseUrl.replace(/\/+$/, ''),
    username,
    password,
    site: process.env.ALFRESCO_SITE || undefined,
    searchUrl: process.env.ALFRESCO_SEARCH_URL || undefined,
  };
}

// The core API lives at .../public/alfresco/versions/1 and the Search API at
// .../public/search/versions/1/search on the same server.
function deriveSearchUrl(baseUrl: string): string {
  return baseUrl.replace(/\/alfresco\/versions\/\d+$/, '') + '/search/versions/1/search';
}

// Quotes a value for an AFTS query.
function aftsQuote(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

const NODE_ID_PATTERN = /^[A-Za-z0-9-]+$/;

function stripHighlightTags(text: string): string {
  return text
    .replace(/<\/?em>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function toFileType(mimeType: string | undefined): Document['fileType'] {
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType?.startsWith('image/')) return 'image';
  return 'text';
}

// Keeps cm:title short enough to read in Share's lists and detail pages.
const MAX_TITLE_LENGTH = 255;
const TITLE_KEYWORD_SEPARATOR = ', ';

// The extracted keywords as a cm:title, dropping whole keywords from the end
// (rather than cutting one in half) once the title would get too long.
function keywordTitle(keywords: string[], fallback: string): string {
  let title = '';
  for (const keyword of keywords.map(k => k.trim()).filter(Boolean)) {
    const next = title ? `${title}${TITLE_KEYWORD_SEPARATOR}${keyword}` : keyword;
    if (next.length > MAX_TITLE_LENGTH) break;
    title = next;
  }
  // A single keyword longer than the limit still gets in, cut short
  if (!title && keywords.length > 0) title = keywords[0].trim().slice(0, MAX_TITLE_LENGTH);
  return title || fallback;
}

// Documents exported by this app carry their extraction results as JSON in cm:description.
function parseExportedDescription(description: unknown): {
  filename?: string;
  originalPrompt?: string;
  extractedData?: Record<string, any>;
  keywords?: string[];
} | null {
  if (typeof description !== 'string' || !description.trim().startsWith('{')) return null;
  try {
    const parsed = JSON.parse(description);
    if (!parsed || typeof parsed !== 'object' || typeof parsed.extractedData !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

export class AlfrescoService {
  private baseUrl: string;
  private authHeader: string;
  private site: string;
  private searchUrl: string;
  private docLibraryId: string | null = null;

  constructor(config: AlfrescoConfig) {
    this.baseUrl = config.baseUrl;
    this.authHeader = `Basic ${Buffer.from(`${config.username}:${config.password}`).toString('base64')}`;
    this.site = config.site || 'demo';
    this.searchUrl = config.searchUrl || deriveSearchUrl(config.baseUrl);
  }

  get siteId(): string {
    return this.site;
  }

  private authHeaders(): Record<string, string> {
    return { Authorization: this.authHeader };
  }

  /**
   * Test connection to Alfresco
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}/nodes/-root-`, { headers: this.authHeaders() });
      return response.status === 200;
    } catch (error) {
      console.error('Alfresco connection test failed:', describeError(error));
      return false;
    }
  }

  /**
   * Get the configured site's document library node ID
   */
  async getSiteDocumentLibrary(): Promise<string> {
    if (this.docLibraryId) return this.docLibraryId;
    try {
      // Get all containers for the site
      const response = await axios.get(`${this.baseUrl}/sites/${encodeURIComponent(this.site)}/containers`, {
        headers: this.authHeaders(),
      });

      // Find the documentLibrary container
      const docLibrary = response.data.list.entries.find(
        (entry: AlfrescoNodeEntry) => entry.entry.folderId === 'documentLibrary',
      );

      if (docLibrary) {
        this.docLibraryId = docLibrary.entry.id as string;
        return this.docLibraryId;
      } else {
        throw new Error(`Document library not found for site "${this.site}"`);
      }
    } catch (error) {
      console.error(`Error getting document library for site "${this.site}":`, describeError(error));
      throw error;
    }
  }

  /**
   * Store actual binary file to demo site with extracted data as properties
   */
  async storeDocumentData(document: Document, filePath: string): Promise<AlfrescoExportResult> {
    try {
      // Get the site's document library
      const docLibraryId = await this.getSiteDocumentLibrary();

      const fileContent = await fs.readFile(filePath);

      // Get file extension
      const fileExt =
        document.filename.lastIndexOf('.') > -1 ? document.filename.substring(document.filename.lastIndexOf('.')) : '';
      const baseName = fileExt ? document.filename.substring(0, document.filename.lastIndexOf('.')) : document.filename;

      // Create unique filename with timestamp
      const timestamp = Date.now();
      const uniqueFilename = `${baseName}-${timestamp}${fileExt}`;

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('filedata', fileContent, uniqueFilename);

      // Upload file to demo site document library
      const uploadResponse = await axios.post(
        `${this.baseUrl}/nodes/${docLibraryId}/children?autoRename=true`,
        formData,
        {
          headers: { ...formData.getHeaders(), ...this.authHeaders() },
        },
      );

      const nodeId = uploadResponse.data.entry?.id;
      if (!nodeId) {
        console.error('No node ID returned from upload:', uploadResponse.data);
        throw new Error('File uploaded but no node ID returned');
      }

      // Store the extracted data as JSON in standard Alfresco fields. The title
      // holds the keywords; the original filename (the node is named with a
      // timestamp to keep it unique) goes in the JSON.
      const simpleProperties = {
        'cm:title': keywordTitle(document.keywords, document.filename),
        'cm:description': JSON.stringify(
          {
            filename: document.filename,
            uploadedAt: document.uploadedAt,
            originalPrompt: document.originalPrompt,
            extractedData: document.extractedData,
            fileType: document.fileType,
            keywords: document.keywords,
          },
          null,
          2,
        ),
      };

      // Update node properties
      try {
        const updateResponse = await axios.put(
          `${this.baseUrl}/nodes/${nodeId}`,
          { properties: simpleProperties },
          {
            headers: { ...this.authHeaders(), 'Content-Type': 'application/json' },
          },
        );

        if (updateResponse.status !== 200) {
          console.warn(`Unexpected status updating properties for ${nodeId}: ${updateResponse.status}`);
        }
      } catch (updateErr) {
        console.error(`Failed to update properties for ${nodeId}:`, describeError(updateErr));
      }

      return {
        success: true,
        nodeId: nodeId,
        filename: document.filename,
        location: `${this.site} site document library`,
        message: `File exported to ${this.site} site with metadata properties`,
      };
    } catch (error) {
      console.error('Error storing document in Alfresco:', describeError(error));
      throw error;
    }
  }

  /**
   * Get the documents at the top level of the site's document library
   */
  async listDocuments(): Promise<AlfrescoNodeEntry[]> {
    try {
      const docLibraryId = await this.getSiteDocumentLibrary();
      const response = await axios.get(`${this.baseUrl}/nodes/${docLibraryId}/children?maxItems=100`, {
        headers: this.authHeaders(),
      });

      return response.data.list.entries;
    } catch (error) {
      console.error('Error listing documents:', describeError(error));
      throw error;
    }
  }

  /**
   * Search documents anywhere under the site's document library (including
   * subfolders). With `match: 'any'`, a document matching any term counts,
   * which suits natural-language chat questions; 'all' suits the search box.
   */
  async searchDocuments(options: {
    query?: string;
    terms?: string[];
    match?: 'all' | 'any';
    skip?: number;
    maxItems?: number;
  }): Promise<AlfrescoSearchResult> {
    const docLibraryId = await this.getSiteDocumentLibrary();
    const terms = (options.terms ?? (options.query || '').split(/\s+/)).map(t => t.trim()).filter(t => t.length > 0);

    const clauses = [`ANCESTOR:${aftsQuote(`workspace://SpacesStore/${docLibraryId}`)}`, 'TYPE:"cm:content"'];
    if (terms.length > 0) {
      const termClauses = terms.map(term => {
        const q = aftsQuote(term);
        // cm:name gets a prefix match so partial filenames still find documents
        return `(cm:name:${aftsQuote(`${term.replace(/[*?]/g, '')}*`)} OR cm:title:${q} OR cm:description:${q} OR TEXT:${q})`;
      });
      clauses.push(`(${termClauses.join(options.match === 'any' ? ' OR ' : ' AND ')})`);
    }

    try {
      const response = await axios.post(
        this.searchUrl,
        {
          query: { query: clauses.join(' AND '), language: 'afts' },
          include: ['properties', 'path'],
          paging: { skipCount: options.skip ?? 0, maxItems: options.maxItems ?? 10 },
          // Newest first when browsing; by relevance when searching
          ...(terms.length === 0 ? { sort: [{ type: 'FIELD', field: 'cm:created', ascending: false }] } : {}),
          highlight: { fields: [{ field: 'cm:content' }], snippetCount: 1, fragmentSize: 160 },
        },
        { headers: { ...this.authHeaders(), 'Content-Type': 'application/json' } },
      );
      const entries: { entry: AlfrescoNode }[] = response.data.list.entries;
      return {
        documents: entries.map(e => this.toAppDocument(e.entry)),
        totalItems: response.data.list.pagination.totalItems ?? entries.length,
      };
    } catch (error) {
      throw this.wrapError(error, 'Alfresco search failed');
    }
  }

  /**
   * Get one document, only if it's inside the site's document library.
   */
  async getSiteDocument(nodeId: string): Promise<AlfrescoDocument> {
    return this.toAppDocument(await this.getSiteNode(nodeId));
  }

  /**
   * Stream a document's content, only if it's inside the site's document library.
   */
  async getSiteDocumentContent(
    nodeId: string,
  ): Promise<{ stream: Readable; mimeType: string; filename: string; size?: number }> {
    const node = await this.getSiteNode(nodeId);
    try {
      const response = await axios.get(`${this.baseUrl}/nodes/${nodeId}/content`, {
        headers: this.authHeaders(),
        responseType: 'stream',
      });
      return {
        stream: response.data,
        mimeType: node.content?.mimeType || 'application/octet-stream',
        filename: node.name,
        size: node.content?.sizeInBytes,
      };
    } catch (error) {
      throw this.wrapError(error, 'Failed to download document content');
    }
  }

  /**
   * Stream the document's "doclib" thumbnail rendition, or null when Alfresco
   * hasn't made it yet. Renditions are created on request, so a missing one is
   * requested here (as Share does when browsing) and is ready on a later load.
   */
  async getSiteDocumentThumbnail(nodeId: string): Promise<{ stream: Readable; mimeType: string } | null> {
    await this.getSiteNode(nodeId);
    const headers = this.authHeaders();
    try {
      const response = await axios.get(`${this.baseUrl}/nodes/${nodeId}/renditions/doclib/content`, {
        headers,
        responseType: 'stream',
      });
      const contentType = response.headers['content-type'];
      return { stream: response.data, mimeType: typeof contentType === 'string' ? contentType : 'image/png' };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        // Already requested (409) or no thumbnail possible for this file type: nothing to do either way.
        axios
          .post(
            `${this.baseUrl}/nodes/${nodeId}/renditions`,
            { id: 'doclib' },
            { headers: { ...headers, 'Content-Type': 'application/json' } },
          )
          .catch(() => {});
        return null;
      }
      throw this.wrapError(error, 'Failed to load thumbnail');
    }
  }

  // Fetches a node and rejects anything outside the site's document library, so
  // the browsing endpoints can't be used to read other parts of the repository.
  private async getSiteNode(nodeId: string): Promise<AlfrescoNode> {
    if (!NODE_ID_PATTERN.test(nodeId)) {
      throw new AlfrescoError('Invalid document id', 400);
    }
    const docLibraryId = await this.getSiteDocumentLibrary();
    let node: AlfrescoNode;
    try {
      const response = await axios.get(`${this.baseUrl}/nodes/${nodeId}`, {
        headers: this.authHeaders(),
        params: { include: 'properties,path' },
      });
      node = response.data.entry;
    } catch (error) {
      throw this.wrapError(error, 'Failed to load document');
    }
    const inSite = node.path?.elements?.some(el => el.id === docLibraryId);
    if (!inSite || !node.content) {
      throw new AlfrescoError('Document not found', 404);
    }
    return node;
  }

  // Maps an Alfresco node onto the app's document shape so the UI can reuse
  // its existing components.
  private toAppDocument(node: AlfrescoNode): AlfrescoDocument {
    const props = node.properties || {};
    const exported = parseExportedDescription(props['cm:description']);
    const title = typeof props['cm:title'] === 'string' && props['cm:title'].trim() ? props['cm:title'] : undefined;
    // Exports keep the original filename in their JSON (older exports had it in
    // cm:title, newer ones put keywords there); other documents are shown by
    // their own title, as set in Alfresco, or their name.
    const displayName = (exported ? exported.filename || title : title) || node.name;
    const highlight = node.search?.highlight?.find(h => h.field === 'cm:content')?.snippets?.[0];
    const origin = this.baseUrl.match(/^https?:\/\/[^/]+/)?.[0];

    return {
      id: node.id,
      filename: displayName,
      uploadedAt: node.createdAt,
      originalPrompt: exported?.originalPrompt || '',
      extractedData: exported?.extractedData || {},
      fileType: toFileType(node.content?.mimeType),
      keywords: Array.isArray(exported?.keywords) ? exported.keywords : [],
      alfresco: {
        nodeId: node.id,
        name: node.name,
        path: node.path?.name,
        mimeType: node.content?.mimeType,
        sizeInBytes: node.content?.sizeInBytes,
        createdBy: node.createdByUser?.displayName,
        modifiedAt: node.modifiedAt,
        modifiedBy: node.modifiedByUser?.displayName,
        description: !exported && typeof props['cm:description'] === 'string' ? props['cm:description'] : undefined,
        exportedByApp: !!exported,
        snippet: highlight ? stripHighlightTags(highlight) : undefined,
        shareUrl: origin
          ? `${origin}/share/page/document-details?nodeRef=workspace://SpacesStore/${node.id}`
          : undefined,
      },
    };
  }

  private wrapError(error: unknown, message: string): AlfrescoError {
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;
    console.error(`${message}:`, describeError(error));
    if (status === 404) return new AlfrescoError('Document not found', 404);
    if (status === 401 || status === 403) {
      return new AlfrescoError('Alfresco rejected the configured credentials', 502);
    }
    return new AlfrescoError(message, 502);
  }
}
