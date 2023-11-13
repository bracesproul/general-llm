import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ArxivNotes } from "@/types";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const submitPaperSchema = z.object({
  paperUrl: z.string(),
  paperName: z.string(),
  pagesToDelete: z.string().optional(),
});

const askQuestionSchema = z.object({
  question: z.string(),
});

export default function Home() {
  const [paperData, setPaperData] = useState<
    undefined | { paperUrl: string; name: string }
  >(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [notes, setNotes] = useState<Array<ArxivNotes>>([]);
  const [questionAnswers, setQuestionAnswers] = useState<
    Array<{ answer: string; followupQuestions: string[] }>
  >([]);

  const submitPaperForm = useForm<z.infer<typeof submitPaperSchema>>({
    resolver: zodResolver(submitPaperSchema),
    defaultValues: paperData
      ? { paperUrl: paperData.paperUrl, paperName: paperData.name }
      : undefined,
  });

  const askQuestionForm = useForm<z.infer<typeof askQuestionSchema>>({
    resolver: zodResolver(askQuestionSchema),
  });

  async function onSubmitProcessPaper(
    values: z.infer<typeof submitPaperSchema>
  ) {
    setIsLoading(true);
    setPaperData({ paperUrl: values.paperUrl, name: values.paperName });
    let data: Record<string, string | number[] | undefined> = {};
    try {
      const pagesToDelete = values.pagesToDelete
        ? values.pagesToDelete.split(",").map((page) => +page.trim())
        : undefined;
      if (
        pagesToDelete !== undefined &&
        pagesToDelete.some((page) => Number.isNaN(page))
      )
        throw new Error("Invalid page numbers");
      data = {
        ...values,
        pagesToDelete,
      };
    } catch (e) {
      // handle error
      return;
    }
    const response = await fetch("/api/process_paper", {
      method: "POST",
      body: JSON.stringify(data),
    });
    setIsLoading(false);
    if (response.ok || response.status === 200) {
      const data = await response.json();
      setNotes(data);
    } else {
      throw new Error("Something went wrong");
    }
  }

  async function askQuestion(input: {
    question: string;
    paperUrl: string;
    name: string;
  }) {
    setIsLoading(true);
    const response = await fetch("/api/qa", {
      method: "POST",
      body: JSON.stringify(input),
    });
    setIsLoading(false);
    if (response.ok) {
      const data = await response.json();
      return data;
    } else {
      throw new Error("Something went wrong");
    }
  }

  async function onSubmitAskQuestion(
    values: z.infer<typeof askQuestionSchema>
  ) {
    if (!paperData) return;
    const data = await askQuestion({
      ...values,
      ...paperData,
    });
    setQuestionAnswers(data);
  }

  const dropdownIcon = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <path d="m7 15 5 5 5-5"></path>
      <path d="m7 9 5-5 5 5"></path>
    </svg>
  );

  return (
    <div className="flex flex-col items-center">
      <h1 className="text-black text-2xl">Arxiv Paper QA</h1>
      <div className="flex flex-col md:flex-row items-center gap-5">
        <div className="flex flex-col items-center justify-center mt-10 px-5 py-4 border-[1px] border-gray-200 rounded-md shadow-inner w-[400px]">
          <Form {...submitPaperForm}>
            <form
              onSubmit={submitPaperForm.handleSubmit(onSubmitProcessPaper)}
              className="space-y-8 w-full"
            >
              <FormField
                control={submitPaperForm.control}
                name="paperUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Paper URL (.pdf)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://arxiv.org/pdf/2305.15334.pdf"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      The link to the PDF version of the paper.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={submitPaperForm.control}
                name="paperName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Paper Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Gorilla: Large Language Model Connected with Massive APIs"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>The name of the paper.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Collapsible>
                <CollapsibleTrigger>
                  <span className="flex flex-row gap-1 items-center text-black">
                    <p>Delete pages?</p>
                    {dropdownIcon}
                  </span>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <span className="flex flex-col my-2">
                    <p className="text-sm text-gray-600">
                      Optionally, if there are pages in the PDF you wish to be
                      removed, list them here.
                    </p>
                    <p className="text-sm text-gray-600">
                      Page numbers should be a comma separated list starting
                      from 1.
                    </p>
                    <p className="text-sm text-gray-600">
                      For example if you want to delete pages 10-14, you would
                      enter 10,11,12,13,14
                    </p>
                  </span>
                  <FormField
                    control={submitPaperForm.control}
                    name="pagesToDelete"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pages to delete</FormLabel>
                        <FormControl>
                          <Input placeholder="10,11,12,13,14" {...field} />
                        </FormControl>
                        <FormDescription>
                          The page numbers to delete.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CollapsibleContent>
              </Collapsible>
              <Button disabled={isLoading} type="submit">
                Submit
              </Button>
            </form>
          </Form>
        </div>
        <div className="flex flex-col items-center justify-center mt-10 mb-auto px-5 py-4 border-[1px] border-gray-200 rounded-md shadow-inner w-[400px]">
          <Form {...askQuestionForm}>
            <form
              onSubmit={askQuestionForm.handleSubmit(onSubmitAskQuestion)}
              className="space-y-8 w-full"
            >
              <FormField
                control={askQuestionForm.control}
                name="question"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Question</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="How does Gorilla manage the AST?"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      A question to ask about the paper.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button disabled={isLoading} type="submit">
                Submit
              </Button>
            </form>
          </Form>
        </div>
      </div>
      {questionAnswers.length > 0 ? (
        <>
          <h1 className="text-black text-2xl mt-10 mb-5">Answer(s)</h1>
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-3">
              {questionAnswers.map(({ answer, followupQuestions }, index) => (
                <div
                  key={index}
                  className="flex flex-col max-w-[500px] whitespace-pre-line"
                >
                  <p className="text-lg text-black text-left">
                    <span className="text-sm text-gray-500">{index + 1}</span>{" "}
                    {answer}
                  </p>
                  {followupQuestions.length > 0 && (
                    <div className="flex flex-col">
                      {followupQuestions.map((followupQuestion, index) => (
                        <p
                          key={index}
                          className="text-md text-gray-600 text-left"
                          onClick={() =>
                            onSubmitAskQuestion({ question: followupQuestion })
                          }
                        >
                          <span className="text-sm text-gray-500">
                            Follow-up Question:
                          </span>{" "}
                          <span className="hover:bg-gray-100 hover:rounded-md hover:cursor-pointer px-2 py-1">
                            {followupQuestion}
                          </span>
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}
      <h1 className="text-black text-2xl mt-10 mb-5">Arxiv Paper QA</h1>
      <div className="flex flex-col gap-3">
        {notes.map(({ note, pageNumbers }, index) => (
          <div
            key={index}
            className="flex flex-col max-w-[500px] whitespace-pre-line"
          >
            <p className="text-lg text-black text-left">
              <span className="text-sm text-gray-500">{index + 1}</span> {note}
            </p>
            <p className="text-md text-gray-600 text-left">
              <span className="text-sm text-gray-500">Page(s):</span>{" "}
              {pageNumbers.join(", ")}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
