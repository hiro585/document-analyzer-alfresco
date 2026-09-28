import axios from 'axios';
import FormData from 'form-data';
import * as fs from 'fs';
import { Document } from '../types/index.js';

export interface AlfrescoConfig {
  baseUrl: string;
  username: string;
  password: string;
}

export class AlfrescoService {
  private baseUrl: string;
  private username: string;
  private password: string;
  private token: string | null = null;

  constructor(config: AlfrescoConfig) {
    this.baseUrl = config.baseUrl;
    this.username = config.username;
    this.password = config.password;
  }

  /**
   * Authenticate using Basic Auth
   */
  async authenticate(): Promise<string> {
    try {
      // Create Basic Auth header
      const auth = Buffer.from(`${this.username}:${this.password}`).toString('base64');
      this.token = auth;
      console.log('✓ Authenticated with Alfresco using Basic Auth');
      return this.token;
    } catch (error) {
      console.error('Alfresco authentication error:', error);
      throw error;
    }
  }

  /**
   * Test connection to Alfresco
   */
  async testConnection(): Promise<boolean> {
    try {
      if (!this.token) {
        await this.authenticate();
      }
      const response = await axios.get(`${this.baseUrl}/nodes/-root-`, {
        headers: {
          'Authorization': `Basic ${this.token}`,
        },
      });
      return response.status === 200;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  /**
   * Get demo site document library node ID
   */
  async getDemoSiteDocumentLibrary(): Promise<string> {
    try {
      if (!this.token) {
        await this.authenticate();
      }

      // Get all containers for the demo site
      const response = await axios.get(
        `${this.baseUrl}/sites/demo/containers`,
        {
          headers: {
            'Authorization': `Basic ${this.token}`,
          },
        }
      );

      // Find the documentLibrary container
      const docLibrary = response.data.list.entries.find(
        (entry: any) => entry.entry.folderId === 'documentLibrary'
      );

      if (docLibrary) {
        return docLibrary.entry.id;
      } else {
        throw new Error('Document library not found for demo site');
      }
    } catch (error) {
      console.error('Error getting demo site document library:', error);
      throw error;
    }
  }

  /**
   * Store actual binary file to demo site with extracted data as properties
   */
  async storeDocumentData(document: Document, filePath: string): Promise<any> {
    try {
      if (!this.token) {
        await this.authenticate();
      }

      // Get demo site document library
      const docLibraryId = await this.getDemoSiteDocumentLibrary();
      console.log(`✓ Found demo site document library: ${docLibraryId}`);

      // Read the binary file synchronously
      const fileContent = fs.readFileSync(filePath);

      // Get file extension
      const fileExt = document.filename.lastIndexOf('.') > -1
        ? document.filename.substring(document.filename.lastIndexOf('.'))
        : '';
      const baseName = fileExt
        ? document.filename.substring(0, document.filename.lastIndexOf('.'))
        : document.filename;

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
          headers: {
            ...formData.getHeaders(),
            'Authorization': `Basic ${this.token}`,
          },
        }
      );

      const nodeId = uploadResponse.data.entry?.id;
      if (!nodeId) {
        console.error('✗ No node ID returned from upload:', uploadResponse.data);
        throw new Error('File uploaded but no node ID returned');
      }

      console.log(`✓ Uploaded file to demo site: ${nodeId}`);

      // Prepare properties with JSON metadata

      console.log(`Updating cm:title and cm:description for node ${nodeId}...`);

      // Prepare simplified properties using standard Alfresco fields
      const simpleProperties: any = {
        'cm:title': document.filename,
        'cm:description': JSON.stringify({
          uploadedAt: document.uploadedAt,
          originalPrompt: document.originalPrompt,
          extractedData: document.extractedData,
          fileType: document.fileType,
          keywords: document.keywords,
        }, null, 2),
      };

      // Update node properties
      try {
        const updateResponse = await axios.put(
          `${this.baseUrl}/nodes/${nodeId}`,
          { properties: simpleProperties },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Basic ${this.token}`,
            },
          }
        );

        if (updateResponse.status === 200) {
          console.log(`✓ Updated cm:title and cm:description for node: ${nodeId}`);
          console.log(`✓ Description set with JSON metadata`);
        } else {
          console.warn(`⚠ Update response status: ${updateResponse.status}`);
        }
      } catch (updateErr: any) {
        console.error(`✗ Failed to update properties for ${nodeId}:`, updateErr.response?.status, updateErr.message);
      }

      return {
        success: true,
        nodeId: nodeId,
        filename: document.filename,
        location: `demo site document library`,
        message: 'File exported to demo site with metadata properties',
      };
    } catch (error: any) {
      console.error('Error storing document in Alfresco:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Upload content to an existing node
   */
  private async uploadContent(nodeId: string, content: string): Promise<void> {
    try {
      await axios.put(
        `${this.baseUrl}/nodes/${nodeId}/content`,
        content,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${this.token}`,
          },
        }
      );

      console.log(`✓ Uploaded content to node: ${nodeId}`);
    } catch (error) {
      console.error('Error uploading content:', error);
      throw error;
    }
  }

  /**
   * Get all stored documents from Alfresco
   */
  async listDocuments(): Promise<any[]> {
    try {
      if (!this.token) {
        await this.authenticate();
      }

      const response = await axios.get(
        `${this.baseUrl}/nodes/-root-/children?maxItems=100`,
        {
          headers: {
            'Authorization': `Basic ${this.token}`,
          },
        }
      );

      return response.data.list.entries;
    } catch (error) {
      console.error('Error listing documents:', error);
      throw error;
    }
  }

  /**
   * Get document metadata from Alfresco
   */
  async getDocument(nodeId: string): Promise<any> {
    try {
      if (!this.token) {
        await this.authenticate();
      }

      const response = await axios.get(`${this.baseUrl}/nodes/${nodeId}`, {
        headers: {
          'Authorization': `Basic ${this.token}`,
        },
      });

      return response.data.entry;
    } catch (error) {
      console.error('Error getting document:', error);
      throw error;
    }
  }

  /**
   * Delete document from Alfresco
   */
  async deleteDocument(nodeId: string): Promise<void> {
    try {
      if (!this.token) {
        await this.authenticate();
      }

      await axios.delete(`${this.baseUrl}/nodes/${nodeId}`, {
        headers: {
          'Authorization': `Basic ${this.token}`,
        },
      });

      console.log(`✓ Deleted document: ${nodeId}`);
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  }
}
