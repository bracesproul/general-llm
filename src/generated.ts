export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      arxiv_embeddings: {
        Row: {
          arxiv_paper: string;
          created_at: string;
          embedding: string;
          id: string;
          metadata: Json;
          pageContent: string;
        };
        Insert: {
          arxiv_paper: string;
          created_at?: string;
          embedding: string;
          id?: string;
          metadata: Json;
          pageContent: string;
        };
        Update: {
          arxiv_paper?: string;
          created_at?: string;
          embedding?: string;
          id?: string;
          metadata?: Json;
          pageContent?: string;
        };
        Relationships: [
          {
            foreignKeyName: "arxiv_embeddings_arxiv_paper_fkey";
            columns: ["arxiv_paper"];
            isOneToOne: false;
            referencedRelation: "arxiv_papers";
            referencedColumns: ["id"];
          }
        ];
      };
      arxiv_papers: {
        Row: {
          arxiv_url: string;
          created_at: string;
          id: string;
          name: string;
          notes: Json[];
          paper: string;
        };
        Insert: {
          arxiv_url: string;
          created_at?: string;
          id?: string;
          name: string;
          notes: Json[];
          paper: string;
        };
        Update: {
          arxiv_url?: string;
          created_at?: string;
          id?: string;
          name?: string;
          notes?: Json[];
          paper?: string;
        };
        Relationships: [];
      };
      chat_message: {
        Row: {
          content: string;
          created_at: string;
          id: string;
          is_user: boolean;
          session_id: string;
        };
        Insert: {
          content: string;
          created_at?: string;
          id?: string;
          is_user: boolean;
          session_id: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          id?: string;
          is_user?: boolean;
          session_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chat_message_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "chat_session";
            referencedColumns: ["id"];
          }
        ];
      };
      chat_session: {
        Row: {
          created_at: string;
          id: string;
          journal_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          journal_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          journal_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chat_session_journal_id_fkey";
            columns: ["journal_id"];
            isOneToOne: false;
            referencedRelation: "journals";
            referencedColumns: ["id"];
          }
        ];
      };
      documents: {
        Row: {
          content: string | null;
          embedding: string | null;
          id: number;
          metadata: Json | null;
        };
        Insert: {
          content?: string | null;
          embedding?: string | null;
          id?: number;
          metadata?: Json | null;
        };
        Update: {
          content?: string | null;
          embedding?: string | null;
          id?: number;
          metadata?: Json | null;
        };
        Relationships: [];
      };
      journals: {
        Row: {
          content: string;
          created_at: string;
          id: string;
          user_id: string;
        };
        Insert: {
          content: string;
          created_at?: string;
          id?: string;
          user_id: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "journals_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      hnswhandler: {
        Args: {
          "": unknown;
        };
        Returns: unknown;
      };
      ivfflathandler: {
        Args: {
          "": unknown;
        };
        Returns: unknown;
      };
      match_documents: {
        Args: {
          query_embedding: string;
          match_count?: number;
          filter?: Json;
        };
        Returns: {
          id: number;
          content: string;
          metadata: Json;
          embedding: Json;
          similarity: number;
        }[];
      };
      vector_avg: {
        Args: {
          "": number[];
        };
        Returns: string;
      };
      vector_dims: {
        Args: {
          "": string;
        };
        Returns: number;
      };
      vector_norm: {
        Args: {
          "": string;
        };
        Returns: number;
      };
      vector_out: {
        Args: {
          "": string;
        };
        Returns: unknown;
      };
      vector_send: {
        Args: {
          "": string;
        };
        Returns: string;
      };
      vector_typmod_in: {
        Args: {
          "": unknown[];
        };
        Returns: number;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
