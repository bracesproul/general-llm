import express, { Request, Response } from 'express';

function main() {
  const app = express();
  const port = process.env.PORT || 8080;

  app.use(express.json());

  app.get('/', (_req: Request, res: Response) =>
    // healthcheck
    res.send('ok')
  );

  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}

main();
