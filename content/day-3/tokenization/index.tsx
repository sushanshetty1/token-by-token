"use client";

import type { LessonModule } from "@/lib/types";
import { tokenTint } from "@/lib/color";
import { Stage } from "./Stage";

const CODE = `def get_stats(ids):
    counts = {}
    for pair in zip(ids, ids[1:]):  # every adjacent pair
        counts[pair] = counts.get(pair, 0) + 1
    return counts

def merge(ids, pair, idx):
    out, i = [], 0
    while i < len(ids):
        if i < len(ids) - 1 and (ids[i], ids[i + 1]) == pair:
            out.append(idx)  # the pair becomes one new token
            i += 2
        else:
            out.append(ids[i])
            i += 1
    return out

def train(text, vocab_size):
    ids = list(text.encode("utf-8"))  # 256 base tokens: the raw bytes
    merges = {}
    for i in range(vocab_size - 256):
        stats = get_stats(ids)
        pair = max(stats, key=stats.get)  # ties: the pair seen first wins
        idx = 256 + i
        ids = merge(ids, pair, idx)
        merges[pair] = idx
    return merges

def encode(text, merges):
    ids = list(text.encode("utf-8"))
    while len(ids) >= 2:
        stats = get_stats(ids)
        pair = min(stats, key=lambda p: merges.get(p, float("inf")))  # earliest merge first
        if pair not in merges:
            break  # nothing left to merge
        ids = merge(ids, pair, merges[pair])
    return ids

def decode(ids, merges):
    vocab = {i: bytes([i]) for i in range(256)}
    for (a, b), idx in merges.items():  # dicts keep merge order
        vocab[idx] = vocab[a] + vocab[b]
    return b"".join(vocab[i] for i in ids).decode("utf-8", errors="replace")

merges = train("aaabdaaabac", vocab_size=259)
print(merges)  # {(97, 97): 256, (256, 97): 257, (257, 98): 258}
print(encode("aaabdaaabac", merges))  # [258, 100, 258, 97, 99]
print(decode([258, 100], merges))  # aaabd
`;

const lesson: LessonModule = {
  rail: [
    { id: "text", label: "Text" },
    { id: "tokens", label: "Tokens" },
    { id: "vocab", label: "Vocab size" },
    { id: "merges", label: "Merges" },
  ],
  learn: [
    "Explain why LLMs use subword tokens instead of characters or whole words.",
    "Run byte pair encoding by hand: count pairs, merge the top one, repeat.",
    "Explain the vocabulary size trade-off with real numbers.",
    "Explain why tokenization makes spelling, arithmetic and non-English text hard.",
    "Say why the tokenizer is a separate stage, trained apart from the model.",
  ],
  legend: [
    { label: "token chip (color follows the id, number under it is the id)", color: tokenTint(0).stroke, shape: "square" },
    { label: "the pair being merged, or the token it became", color: "var(--mark)", shape: "line" },
    { label: "token carried over unchanged", color: "var(--rule-strong)", shape: "line" },
  ],
  code: { filename: "bpe.py", source: CODE, note: "A compact byte-level BPE in the style of minbpe's basic.py." },
  steps: [
    {
      label: "Cut text",
      kind: "intuition",
      title: "A model can only read numbers",
      body: (
        <>
          <p>
            A neural network multiplies numbers, so text has to become a list of integers first. The question is where to cut.
            Cut into <strong>characters</strong> and the vocabulary is tiny, but &quot;the unhappiest cats&quot; is already 19
            tokens and a book becomes a very long sequence. Cut into <strong>words</strong> and it is 3 tokens, but you need a
            huge vocabulary, and a word you did not list has no id.
          </p>
          <p>
            <strong>Subwords</strong> sit in between. GPT-2 reads the phrase as 5 pieces: <code>the</code>, <code>·unh</code>,{" "}
            <code>app</code>, <code>iest</code>, <code>·cats</code> (a <code>·</code> is a space). Common words stay whole, rare
            words break into reusable parts.
          </p>
        </>
      ),
      predict: {
        question: (
          <>
            A word-level tokenizer knows the 100,000 most common words. Your input contains &quot;unhappiest&quot;, which is
            not one of them. What does the model receive for it?
          </>
        ),
        options: [
          "The id of the most similar known word",
          "One shared unknown token, so its meaning is lost",
          "The word spelled out letter by letter",
          "Nothing: the input is rejected",
        ],
        answer: 1,
        explain: (
          <>
            Word-level vocabularies map everything outside the list to a single <code>&lt;unk&gt;</code> id. A rare word, a
            name, a typo and new slang all look identical to the model. Subword tokenizers avoid this by falling back to smaller
            pieces, all the way down to single bytes.
          </>
        ),
      },
      changed: ["Three ways to cut the same 19 characters.", "Numbers under the chips are ids."],
      rail: { text: "the unhappiest cats", tokens: "5 (GPT-2)", vocab: "50,257", merges: "50,000" },
      learns: [0],
    },
    {
      label: "Bytes",
      kind: "mechanism",
      title: "Start from bytes, so nothing is unknown",
      body: (
        <>
          <p>
            GPT tokenizers do not start from characters. They start from the <strong>UTF-8 bytes</strong> of the text. An
            English letter is 1 byte, <code>é</code> is 2, a Kannada letter is 3, an emoji is 4. Every byte is a number from 0
            to 255.
          </p>
          <p>
            So the starting vocabulary is exactly 256 tokens, and any string in any language can be written with them. The catch
            is length: raw bytes make long sequences. BPE&apos;s job is to merge common runs of bytes into bigger tokens.
          </p>
        </>
      ),
      keyIdea: "Byte-level BPE starts from 256 tokens, one per byte value. That is why a GPT never meets an unknown token.",
      code: { ranges: [[19, 19], [30, 30]], caption: "Training and encoding both begin with text.encode(\"utf-8\")." },
      rail: { text: "aaabdaaabac", tokens: "11 bytes", vocab: "256", merges: "0" },
    },
    {
      label: "Pairs",
      kind: "mechanism",
      title: "Count every adjacent pair",
      body: (
        <>
          <p>
            Take a tiny training text, <code>aaabdaaabac</code>: 11 bytes, so 11 tokens. Walk along it and count every pair of
            neighbours. <code>(a, a)</code> appears 4 times, because each <code>aaa</code> contains two overlapping pairs.
            Everything else appears once or twice.
          </p>
          <p>
            The rule of BPE is greedy and simple: take the most frequent pair and give it a brand new id. The first free id is
            256, right after the bytes.
          </p>
        </>
      ),
      predict: {
        question: "Now replace (a, a) with token 256, scanning left to right. The sequence has 11 tokens. How many after the merge?",
        options: ["7", "8", "9", "10"],
        answer: 2,
        explain: (
          <>
            9. The pair is counted 4 times, but a byte can belong to only one token. In each <code>aaa</code> the first two
            a&apos;s merge and the third has no partner left. That is 2 merges, and 11 minus 2 is 9.
          </>
        ),
      },
      code: { ranges: [[1, 5], [22, 23]], caption: "get_stats counts the pairs; max picks the most frequent one." },
      changed: ["Arcs link each adjacent pair. The four (a, a) pairs are saffron.", "The table counts every pair."],
      rail: { tokens: "11" },
    },
    {
      label: "Merge",
      kind: "mechanism",
      title: "Merge the winner into token 256",
      body: (
        <>
          <p>
            Every <code>(97, 97)</code> becomes <code>256</code>. The sequence drops from 11 to 9 tokens and the vocabulary grows
            from 256 to 257. Saffron lines show the two bytes that fused; grey lines show tokens carried over unchanged.
          </p>
          <p>
            Write the merge down. The ordered list of merges <strong>is</strong> the trained tokenizer: to encode new text later,
            you replay these merges in the same order.
          </p>
        </>
      ),
      keyIdea: "One merge adds one token to the vocabulary and shortens every text that contains that pair.",
      code: { ranges: [[7, 16], [24, 26]], caption: "merge swaps each occurrence of the pair for the new id." },
      changed: ["A second row: 9 tokens.", "Merge 1 recorded: (97, 97) becomes 256."],
      rail: { tokens: "9", vocab: "257", merges: "1" },
    },
    {
      label: "Repeat",
      kind: "mechanism",
      title: "Repeat until the vocabulary is big enough",
      body: (
        <>
          <p>
            Count again on the new sequence. <code>(256, 97)</code> and <code>(97, 98)</code> now tie at 2; Python&apos;s{" "}
            <code>max</code> keeps the one it saw first, so 257 means <code>aaa</code>. Then <code>(257, 98)</code> becomes 258,{" "}
            <code>aaab</code>. Three merges take the text from 11 to 9 to 7 to 5 tokens.
          </p>
          <p>
            New tokens can merge again, which is how BPE grows long tokens like <code>·strawberry</code> out of single bytes. You
            stop when the vocabulary reaches the size you chose, here 259.
          </p>
        </>
      ),
      predict: {
        question: "GPT-2 ran this same loop on its training text until the vocabulary had 50,257 tokens. How many merges did it learn?",
        options: ["50,257", "50,001", "50,000", "49,999"],
        answer: 2,
        explain: (
          <>
            50,000. The 256 byte tokens plus 50,000 merges give ids 0 to 50255. The last id, 50256, is the special{" "}
            <code>&lt;|endoftext|&gt;</code> token, added by hand rather than learned. That is the odd 257.
          </>
        ),
      },
      code: { ranges: [[18, 27], [45, 47]], caption: "train loops vocab_size minus 256 times: one merge per new token." },
      changed: ["Two more rows: 7 tokens, then 5.", "Merges 2 and 3 recorded."],
      rail: { tokens: "5", vocab: "259", merges: "3" },
      learns: [1],
    },
    {
      label: "Vocab size",
      kind: "insight",
      title: "Vocabulary size is a trade-off",
      body: (
        <>
          <p>
            More merges means fewer tokens for the same text: more fits in the context window, and generating needs fewer
            forward passes. But each token needs its own row in the embedding table and its own logit in the output layer, and a
            rare token gets few training examples.
          </p>
          <p>
            For English, going from GPT-2&apos;s 50,257 to GPT-4o&apos;s roughly 200k barely helps: 26 tokens versus 24. For
            Kannada it is 55 versus 10, because GPT-4o&apos;s tokenizer learned merges for many more languages.
          </p>
        </>
      ),
      keyIdea: "Bigger vocabulary: shorter sequences, bigger embedding and output layers. GPT-2 uses 50,257 tokens, GPT-4o about 200k.",
      code: { ranges: [[21, 21]], caption: "vocab_size is a choice you make before training: 256 plus the number of merges." },
      changed: ["Real token counts from the GPT-2 and GPT-4o tokenizers.", "Table size grows linearly with the vocabulary."],
      rail: { text: "English, 127 chars", tokens: "24 (GPT-4o)", vocab: "~200k (GPT-4o)", merges: "50,000 (GPT-2)" },
      learns: [2],
    },
    {
      label: "Try it",
      kind: "try",
      title: "Tokenize anything with the real tokenizers",
      body: (
        <>
          <p>
            This is the actual GPT-2 and GPT-4o byte pair encoding, running in your browser. Switch between them and watch the
            token count. Try the presets, then your own name, a URL, a long number, or code with indentation.
          </p>
          <p>
            Look for three things: where words split, whether the space before a word belongs to the token, and how many tokens
            Kannada costs compared with English. Then try typing <code>&lt;|endoftext|&gt;</code>: it comes out as ordinary
            pieces, because special tokens are inserted by code, never by typing their text.
          </p>
        </>
      ),
      predict: {
        question: (
          <>
            In GPT-4o, is <code>the</code> at the start of a text the same token as <code>·the</code> (with the space before
            it) in the middle of a sentence?
          </>
        ),
        options: [
          "Yes: spaces are stripped before tokenizing",
          "No: the leading space is part of the token, so the ids differ",
          "Yes, but a separate space token comes before it",
        ],
        answer: 1,
        explain: (
          <>
            They are different tokens: <code>the</code> is 3086 and <code>·the</code> is 290. Type &quot;the cat. The cat saw
            the dog.&quot; and compare the ids. Pre-tokenization keeps the space attached to the word that follows it.
          </>
        ),
      },
      code: { ranges: [[29, 37]], caption: "encode replays the learned merges, earliest first, until none apply." },
      rail: { text: "your text" },
    },
    {
      label: "Spelling",
      kind: "insight",
      title: "Why counting the r's in strawberry is hard",
      body: (
        <>
          <p>
            You see ten letters with three r&apos;s. GPT-4o sees <code>·strawberry</code> as one token, id 101830: a single
            integer with no letters inside. To count the r&apos;s, the model must have memorized how that token is spelled.
            Without the leading space, the same word is three other tokens.
          </p>
          <p>
            Numbers have the same problem. GPT-2 cuts 123456 into <code>123</code>, <code>456</code> but 654321 into{" "}
            <code>·65</code>, <code>43</code>, <code>21</code>, so digits of the same place value land in different spots.
            GPT-4o groups digits in threes from the left, which is consistent but still not aligned to place value: 1234 becomes{" "}
            <code>123</code>, <code>4</code>.
          </p>
        </>
      ),
      keyIdea: "The model never sees letters or digits one by one, only token ids. Spelling and arithmetic have to be learned around that.",
      changed: ["Real GPT-4o tokens for the question.", "Real GPT-2 and GPT-4o tokens for the sum."],
      rail: { text: "strawberry", tokens: "1 (GPT-4o)" },
      learns: [3],
    },
    {
      label: "Quirks",
      kind: "insight",
      title: "Spaces, languages and special tokens",
      body: (
        <>
          <p>
            <code>the</code>, <code>·the</code>, <code>The</code> and <code>·The</code> are four unrelated ids, and the model
            has to learn that they mean the same word. Languages that were rare in the tokenizer&apos;s training text got few
            merges, so they fall back to short pieces: the same sentence is 3 tokens in English, 10 in Kannada with GPT-4o, and
            55 with GPT-2. More tokens means higher cost, slower replies and less room in the context.
          </p>
          <p>
            <strong>Special tokens</strong> like <code>&lt;|endoftext|&gt;</code> are added by hand, outside BPE. GPT-2 places
            it between documents in its training data, as id 50256.
          </p>
        </>
      ),
      code: { ranges: [[43, 43]], caption: "errors=\"replace\": one token can hold part of a multi-byte character, like GPT-2's Kannada tokens." },
      changed: ["Four ids for one word.", "Token cost of the same sentence in two languages."],
      rail: { text: "Kannada", tokens: "10 vs 55" },
      learns: [3],
    },
    {
      label: "Own stage",
      kind: "insight",
      title: "The tokenizer is its own stage",
      body: (
        <>
          <p>
            The tokenizer is trained first, separately, often on a different dataset, with plain counting and no neural network.
            Then it is frozen. The LLM receives integer ids and produces integer ids; text only exists on either side of it.
          </p>
          <p>
            That is why so many LLM oddities trace back to tokenization: the model cannot use information the tokenizer hid
            from it. It also means swapping the tokenizer forces you to retrain at least the embedding and output layers, since
            every row there belongs to one specific id.
          </p>
        </>
      ),
      keyIdea: "The LLM never sees text. It sees ids from a frozen tokenizer that was trained separately.",
      rail: { text: "text in, text out", tokens: "ids in, ids out" },
      code: { ranges: [[29, 43]], caption: "encode and decode are the whole interface between text and the model." },
      learns: [4],
    },
    {
      label: "Recap",
      kind: "recap",
      title: "Recap: from text to token ids",
      body: (
        <>
          <p>
            Text becomes UTF-8 bytes: 256 base tokens. BPE repeatedly merges the most frequent adjacent pair into a new token,
            and the ordered list of merges is the tokenizer. Encoding replays those merges on new text.
          </p>
          <p>
            Vocabulary size trades sequence length against table size. Because the model sees ids rather than letters, spelling,
            arithmetic and non-English text are harder than they look. Next: what the model does with an id.
          </p>
        </>
      ),
      code: { ranges: [[45, 48]], caption: "The whole tokenizer in three calls: train, encode, decode." },
      rail: { text: "aaabdaaabac", tokens: "5", vocab: "259", merges: "3" },
    },
  ],
  Stage,
};

export default lesson;
