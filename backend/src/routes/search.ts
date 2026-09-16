import { Router } from 'express';
import { SearchService } from '../services/search.js';

export function createSearchRouter(search: SearchService): Router {
  const router = Router();

  router.post('/', async (req, res) => {
    try {
      const { query } = req.body;
      if (!query) {
        return res.status(400).json({ error: 'Query is required' });
      }

      const results = await search.keywordSearch(query);
      res.json({ results });
    } catch (error) {
      res.status(500).json({ error: 'Search failed' });
    }
  });

  return router;
}
