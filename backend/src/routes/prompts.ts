import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { StorageService } from '../services/storage.js';

export function createPromptsRouter(storage: StorageService): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    try {
      const prompts = await storage.loadPrompts();
      res.json(prompts);
    } catch (error) {
      res.status(500).json({ error: 'Failed to load prompts' });
    }
  });

  router.post('/', async (req, res) => {
    try {
      const { name, prompt } = req.body;
      if (!name || !prompt) {
        return res.status(400).json({ error: 'Name and prompt are required' });
      }

      const prompts = await storage.loadPrompts();
      const newPrompt = { id: uuidv4(), name, prompt, isTemplate: false };
      prompts.custom.push(newPrompt);
      await storage.savePrompts(prompts);

      res.json(newPrompt);
    } catch (error) {
      res.status(500).json({ error: 'Failed to save prompt' });
    }
  });

  return router;
}
