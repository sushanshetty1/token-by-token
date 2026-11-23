/** Toy numbers for the embeddings lesson. Made up by hand so the clusters are visible. */

export const VOCAB = ["the", "a", "dog", "cat", "man", "bites", "sees", "."];
export const N_EMBD = 6;
export const BLOCK = 6;

/** token_embedding_table: (vocab_size 8, n_embd 6). Columns 0 and 1 carry the "meaning" picture. */
export const TOK: number[][] = [
  [-0.8, 0.6, 0.1, -0.2, 0.3, 0.0],
  [-0.5, 0.9, -0.1, -0.3, 0.2, 0.1],
  [0.5, 0.8, 0.5, 0.2, -0.4, 0.3],
  [0.9, 0.5, 0.4, 0.3, -0.3, -0.2],
  [0.4, 0.4, -0.3, 0.6, -0.5, 0.1],
  [0.4, -0.6, 0.6, -0.5, 0.4, -0.6],
  [0.0, -0.9, -0.4, -0.6, 0.5, 0.2],
  [-0.6, -0.5, 0.0, 0.8, 0.6, 0.4],
];

/** position_embedding_table: (block_size 6, n_embd 6). */
export const POS: number[][] = [
  [0.4, -0.2, 0.3, 0.1, -0.4, 0.2],
  [0.2, 0.3, -0.4, 0.4, 0.1, -0.3],
  [-0.3, 0.4, 0.2, -0.4, 0.3, 0.1],
  [-0.4, -0.1, 0.4, 0.2, 0.2, -0.4],
  [0.1, -0.4, -0.2, -0.3, 0.4, 0.3],
  [0.3, 0.2, -0.3, -0.1, -0.2, 0.4],
];

export const add = (a: number[], b: number[]) => a.map((v, i) => Math.round((v + b[i]) * 10) / 10);

/** x for token id `id` at position `t`. */
export const xAt = (id: number, t: number) => add(TOK[id], POS[t]);

export const SENTENCE = [2, 5, 4];
export const SWAPPED = [4, 5, 2];
