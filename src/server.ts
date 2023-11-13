import express, { Request, Response } from 'express';
import { processPaper } from 'process-paper/index.js';
import { qaOverPaper } from 'qa-over-paper/index.js';

function main() {
  const app = express();
  const port = 8080;

  app.use(express.json());

  app.get('/', (_req, res) =>
    // healthcheck
    res.send('ok')
  );

  app.post('/process_paper', async (req: Request, res: Response) => {
    const { body } = req;
    const { paperUrl, name, pagesToDelete } = await body;
    const notes = await processPaper(paperUrl, name, pagesToDelete);
    res.status(200).send(notes);
  });

  app.post('/qa', async (req: Request, res: Response) => {
    const { body } = req;
    const { question, name, paperUrl } = await body;
    const results = await qaOverPaper(question, name, paperUrl);
    res.status(200).send(results);
  });

  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}

main();
