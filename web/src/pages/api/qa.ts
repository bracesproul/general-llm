import type { NextApiRequest, NextApiResponse } from "next";

type Data = {
  answer: string;
  followupQuestions: string[];
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Array<Data>>
) {
  const url = "http://localhost:8080/qa";
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: req.body,
  });
  if (response.ok) {
    return res.status(200).send(await response.json());
  }
  throw new Error(response.statusText);
}
