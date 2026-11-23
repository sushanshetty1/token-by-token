/** The "What to build next" page: the starter walk-through and the project ideas. Plain data. */

export type Size = "evening" | "weekend" | "week";
export type Topic = "tokens" | "inside" | "training" | "inference" | "post-training" | "apps";

export const SIZES: Record<Size, { label: string; hours: string }> = {
  evening: { label: "An evening", hours: "1 to 3 h" },
  weekend: { label: "A weekend", hours: "6 to 10 h" },
  week: { label: "A week or more", hours: "15 h and up" },
};

export const TOPICS: Record<Topic, string> = {
  tokens: "Tokens",
  inside: "Inside a model",
  training: "Training",
  inference: "Generating text",
  "post-training": "Chat and RL",
  apps: "Using models",
};

export interface Idea {
  id: string;
  title: string;
  size: Size;
  topics: Topic[];
  /** The days whose lessons this project leans on. */
  days: number[];
  /** True when the project starts from tiny_gpt.py. */
  starter?: boolean;
  /** What you have at the end, in one sentence. */
  make: string;
  /** Why it is worth the time. */
  why: string;
  /** The first three moves. */
  start: string[];
  done: string;
  further: string;
  prompt: string;
}

export const IDEAS: Idea[] = [
  {
    id: "names",
    title: "A name generator",
    size: "evening",
    topics: ["training"],
    days: [2, 3, 5],
    starter: true,
    make: "A model that makes up new names that sound real: Indian baby names, town names, Pokémon, whatever list you pick.",
    why: "It is the whole loop at its smallest: data, loss, training, sampling. You can judge every output by eye.",
    start: [
      "Find a list of at least 5,000 names, one per line. Karpathy's names.txt from the makemore repo has 32,000.",
      "Run tiny_gpt.py on it with block_size = 16, because names are short. Note the loss at step 0 and at the end.",
      "Sample 200 names and count how many are already in your list. A model that only copies has memorised.",
    ],
    done: "You can say what the final val loss means per character, and most of your samples are names that are not in the list.",
    further: "Build the Day 3 bigram counting table on the same list and compare its loss with your GPT's. How much did attention buy you?",
    prompt:
      "I trained a character-level GPT on a list of names (one per line). Help me write a short Python script that samples 1,000 names from it, reports the fraction that are exact copies of training names and the average length compared with the training list. Then ask me what those two numbers say about overfitting, and correct my answer.",
  },
  {
    id: "tokenizer-tax",
    title: "The tokenizer tax",
    size: "evening",
    topics: ["tokens"],
    days: [3],
    make: "A one-page table of what the same sentence costs in tokens in English, Hindi, Kannada, Tamil and Python, across GPT-2 and GPT-4o.",
    why: "It shows why some languages pay more per word and fit less into the same context window, and it makes a good short post.",
    start: [
      "pip install tiktoken, then count tokens with the gpt2 and o200k_base encodings.",
      "Take 10 sentences that mean the same thing in every language. FLORES-200 has exactly that, Kannada included.",
      "For each language and tokenizer, report tokens per sentence and characters per token.",
    ],
    done: "You can say which language costs the most, by how much, and why byte pair encoding ends up that way.",
    further: "Add an open model's tokenizer through Hugging Face's AutoTokenizer and plot all three side by side.",
    prompt:
      "Write a Python script with tiktoken that takes a CSV of parallel sentences (columns: language, text) and prints, for the gpt2 and o200k_base encodings, the average tokens per sentence and characters per token for each language. Keep it under 40 lines. Then ask me to predict which language will cost the most before I run it.",
  },
  {
    id: "sampling-dial",
    title: "A sampling dial",
    size: "evening",
    topics: ["inference"],
    days: [1, 6],
    make: "A small page or notebook where you type a prompt and drag temperature, top-k and top-p, watching GPT-2's next-token chances change.",
    why: "Sampling is where most people's mental model is fuzzy. Moving the dials yourself fixes that in an hour.",
    start: [
      "Load GPT-2 small with Hugging Face transformers: GPT2LMHeadModel.from_pretrained(\"gpt2\").",
      "For one prompt, print the 10 most likely next tokens with their probabilities.",
      "Apply temperature, top-k and top-p to that distribution with your own code, then put sliders on it with Gradio.",
    ],
    done: "You can predict which tokens top-p 0.9 keeps for a confident prompt and for an unsure one, before you look.",
    further: "Add a button that samples 20 continuations at once, so you can see the variety each setting gives.",
    prompt:
      "Help me build a Gradio app around GPT-2 small: a text box for the prompt, sliders for temperature, top-k and top-p, and a bar chart of the 15 most likely next tokens after each filter is applied. Write the temperature, top-k and top-p filtering yourself in PyTorch, not with generate(). Then quiz me on what each slider does to the bars.",
  },
  {
    id: "attention-maps",
    title: "Attention maps of a real model",
    size: "evening",
    topics: ["inside"],
    days: [4],
    make: "Heatmaps for all 144 heads of GPT-2 small on a sentence you choose, and three heads you can name by what they do.",
    why: "Day 4 shows attention on four tokens. This shows it inside a model that was trained on the real web.",
    start: [
      "Load GPT-2 small with output_attentions=True and run \"The cat sat on the mat because it was tired\".",
      "Plot a 12 by 12 grid of heatmaps, one per layer and head, with matplotlib.",
      "Hunt for a head that always looks one token back, and one that piles its attention on the first token.",
    ],
    done: "You have named three heads, and you can explain why so many heads park their attention on the first token.",
    further: "Repeat a random sequence of tokens twice and look for induction heads: heads that look at the token after the earlier copy.",
    prompt:
      "Write a Python script that runs GPT-2 small (Hugging Face) on a sentence with output_attentions=True and saves a 12x12 grid of attention heatmaps, one per layer and head, with the tokens as axis labels. Then help me find a previous-token head and explain what an attention sink is, asking me to point to one in my plot.",
  },
  {
    id: "logit-lens",
    title: "Watch a prediction form",
    size: "evening",
    topics: ["inside"],
    days: [4, 6],
    make: "A table that shows, layer by layer, what GPT-2 would predict if you stopped it there. This is called the logit lens.",
    why: "It turns the residual stream from a phrase into something you have watched fill up with an answer.",
    start: [
      "Run GPT-2 small with output_hidden_states=True to get the residual stream after every layer.",
      "Put each one through the final LayerNorm and the unembedding, the same way the last layer is decoded.",
      "Print the top 3 tokens per layer for \"The Eiffel Tower is in the city of\".",
    ],
    done: "You can point at the layer where \"Paris\" first becomes the top guess, and say what the layers before it were doing.",
    further: "Find a prompt the model gets wrong and see at which layer the wrong answer takes over.",
    prompt:
      "Help me implement the logit lens for GPT-2 small in PyTorch with Hugging Face: take the hidden state after every layer, apply ln_f and the language-model head, and print the top 3 tokens with probabilities per layer for a prompt. Then ask me why we apply ln_f before decoding and correct my answer.",
  },
  {
    id: "micrograd",
    title: "micrograd from memory",
    size: "evening",
    topics: ["training"],
    days: [2],
    make: "An autograd engine of about 100 lines, written without looking, that trains a small network to separate two half-moons.",
    why: "If you can write backward() from a blank file, backprop is no longer a word you nod along to.",
    start: [
      "A Value class with data, grad and its parents, plus add, multiply and tanh, each with its own _backward.",
      "backward(): sort the graph topologically, set the output's grad to 1, then walk it in reverse.",
      "Check every gradient against a numerical one, then train a 2-16-16-1 network on scikit-learn's make_moons.",
    ],
    done: "Your gradient check passes and the decision boundary you plot separates the two moons.",
    further: "Add pow, exp and relu, and draw the computation graph with graphviz.",
    prompt:
      "I am writing micrograd from memory. Do not write it for me. I will paste my Value class one method at a time; for each, tell me if the backward rule is right, give me one input where it would fail if it is wrong, and ask me to fix it myself.",
  },
  {
    id: "your-text",
    title: "A GPT on your own text",
    size: "weekend",
    topics: ["training", "tokens"],
    days: [3, 5, 6],
    starter: true,
    make: "The course's mini project: a GPT of about 10M parameters on text you care about, with your own tokenizer, curves, one ablation, a KV cache and a write-up.",
    why: "It is the one project that turns the week into a resume line and a story you can tell in an interview.",
    start: [
      "Collect 1 to 5 MB of text you care about and run tiny_gpt.py on it exactly as it is.",
      "Swap the character tokenizer for the BPE you wrote on Day 3 and compare tokens per sentence.",
      "Scale it on a free Colab GPU: n_embd 384, n_head 6, n_layer 6, block_size 256 is about 10M parameters.",
    ],
    done: "All eight pieces of the mini project in the 7-day plan are ticked off.",
    further: "Write the post. A clear 1,000 words with the curves and the break-it story is worth more than a bigger model.",
    prompt:
      "Be my project reviewer. I am training a 10M-parameter GPT on my own text, with my own BPE tokenizer. Ask me for my loss curves, samples and settings one at a time, mark each out of 10, and tell me the one change most likely to improve the result. Be strict.",
  },
  {
    id: "my-language-bpe",
    title: "A tokenizer for your language",
    size: "weekend",
    topics: ["tokens"],
    days: [3],
    make: "A byte-level BPE tokenizer trained on Kannada (or any language you speak) that needs fewer tokens than GPT-4o on that language.",
    why: "You will see exactly why general tokenizers are expensive for Indian languages, and that a small dedicated one can beat them.",
    start: [
      "Get 10 to 50 MB of text. Hugging Face's wikimedia/wikipedia dataset has a Kannada config (kn) and most other languages.",
      "Train your Day 3 BPE, or minbpe's RegexTokenizer, to a vocabulary of 4,096 on a 5 MB sample first.",
      "Compare tokens per sentence with o200k_base on text the tokenizer has never seen.",
    ],
    done: "You have one chart: tokens per sentence for yours, GPT-2 and GPT-4o, on the same held-out sentences.",
    further: "Train tiny_gpt.py with your tokenizer on the same text and compare samples with the character-level version.",
    prompt:
      "I am training a byte-level BPE tokenizer on Kannada text. Help me plan it: how much text, what vocabulary size, how to split text before merging so Kannada words are not merged across spaces, and how to measure it fairly against tiktoken's o200k_base. Ask me one question at a time and do not write the code until I have answered.",
  },
  {
    id: "break-it-lab",
    title: "The break-it lab",
    size: "weekend",
    topics: ["training", "inside"],
    days: [5],
    starter: true,
    make: "One chart with five loss curves: the normal model, then no causal mask, no positions, no residual connections and no LayerNorm.",
    why: "Every part of a transformer is there for a reason. Seeing what breaks without it is the fastest way to know the reason.",
    start: [
      "Add one setting per removal to tiny_gpt.py, so each run changes exactly one thing.",
      "Log val loss every 100 steps to a CSV per run, with the same seed.",
      "Plot all five on one chart and write one paragraph per curve.",
    ],
    done: "You can explain why removing the mask gives the lowest loss of all and the worst text.",
    further: "Do it again with 8 layers. Which removal hurts more as the model gets deeper, and why?",
    prompt:
      "I am running ablations on a small GPT: no causal mask, no position embeddings, no residual connections, no LayerNorm. Before I show you any results, ask me to predict the final val loss of each relative to the baseline and explain why. Then I will paste my numbers and you tell me where my reasoning was wrong.",
  },
  {
    id: "kv-cache",
    title: "A KV cache, measured",
    size: "weekend",
    topics: ["inference"],
    days: [6],
    starter: true,
    make: "generate() with and without a KV cache, and a chart of tokens per second against how long the text gets.",
    why: "Every chat model is served this way. Building it once makes prefill, decode and memory limits concrete.",
    start: [
      "Keep each layer's past keys and values; for every new token, compute q, k and v for that token only.",
      "With greedy sampling and the same seed, check the cached and uncached versions give identical tokens.",
      "Raise block_size, then time both at 64, 256 and 1,024 tokens.",
    ],
    done: "Both versions give identical tokens, and you can explain your speed chart: why does the gap grow with length?",
    further: "Work out the cache's size in bytes for your model, then for GPT-2 small at 1,024 tokens, and check it against the cheat sheet.",
    prompt:
      "I am adding a KV cache to a small PyTorch GPT whose attention computes q, k, v from one Linear layer. Do not write it for me. Ask me what shape the cache has, where it is updated and what happens to the causal mask when only one new token is processed. Correct each answer before moving to the next.",
  },
  {
    id: "commit-writer",
    title: "Fine-tune GPT-2 on your commit messages",
    size: "weekend",
    topics: ["post-training"],
    days: [6, 7],
    make: "GPT-2 small, fine-tuned on your own git history, that writes commit messages in your style.",
    why: "Fine-tuning a pretrained model is how most real projects start. You will feel how much the pretrained weights already know.",
    start: [
      "Run git log --pretty=%s across your repositories and collect a few thousand lines.",
      "Fine-tune gpt2 for a few hundred steps on Colab, with nanoGPT's init_from='gpt2' or a plain PyTorch loop.",
      "Give base GPT-2 and your model the same prompt and compare 10 samples each.",
    ],
    done: "You can explain why fine-tuning uses a much lower learning rate than training from scratch, and show what happens if you do not.",
    further: "Train on diff and message pairs, with the diff as the prompt. That is supervised fine-tuning, the same idea as Day 7's SFT.",
    prompt:
      "I want to fine-tune GPT-2 small on a few thousand of my commit messages. Help me choose the learning rate, the number of steps and how to hold out a validation set, explaining each choice. Then tell me the two signs of overfitting I should watch for.",
  },
  {
    id: "teach-it-to-chat",
    title: "Teach a tiny model to answer",
    size: "weekend",
    topics: ["post-training"],
    days: [7],
    starter: true,
    make: "tiny_gpt.py turned into a question and answer model for sums, trained with a template and a loss mask.",
    why: "It is Day 7's SFT at a size you can run on a laptop, so the chat template and the mask stop being abstract.",
    start: [
      "Generate 50,000 lines like \"Q: 23+48=? A: 71\" with a few lines of Python. Keep 500 sums aside that never appear in training.",
      "Mask the loss so only the answer's characters count: set the other targets to -1 and pass ignore_index=-1.",
      "Train, then ask it the 500 held-out sums and measure accuracy.",
    ],
    done: "You know your accuracy on sums it never saw, and how it changes with and without the mask.",
    further: "Write the answer's digits in reverse order and watch accuracy jump. Work out why it helps a model that writes left to right.",
    prompt:
      "I am turning a character-level GPT into a model that answers addition questions written as 'Q: 23+48=? A: 71'. Help me write the loss mask so only the answer characters are trained on, using ignore_index=-1. Then ask me why masking matters here and what would change without it.",
  },
  {
    id: "ask-your-notes",
    title: "Ask your notes",
    size: "weekend",
    topics: ["apps"],
    days: [3],
    make: "A small command-line tool that finds the paragraphs in your notes that answer a question, then hands them to any LLM to answer with citations.",
    why: "Retrieval is how most real LLM products ground their answers, and it is built on the embeddings you met on Day 3.",
    start: [
      "Split your notes into chunks of about 200 words.",
      "Embed every chunk with a small sentence-embedding model such as all-MiniLM-L6-v2 and save the vectors.",
      "Embed the question, rank chunks by cosine similarity and print the top 5.",
    ],
    done: "It finds the right paragraph for 8 of 10 questions you wrote, and you can show one question where it fails and say why.",
    further: "Send the top chunks and the question to an LLM, and make it cite the chunk number for every claim.",
    prompt:
      "Help me build a 60-line Python tool that embeds my markdown notes in 200-word chunks with sentence-transformers, saves the vectors with numpy, and answers a question by printing the 5 most similar chunks. Then ask me why cosine similarity finds meaning and not just shared words.",
  },
  {
    id: "reproduce-gpt2",
    title: "Reproduce GPT-2 (124M)",
    size: "week",
    topics: ["training"],
    days: [6],
    make: "Your own GPT-2 small, trained from scratch on 10B tokens of FineWeb-Edu and scored on HellaSwag, following build-nanogpt.",
    why: "It is the real thing at the smallest size that matters, and every step of it is something an interviewer can ask about.",
    start: [
      "Work through Let's reproduce GPT-2 with build-nanogpt open beside you, running every stage on a small GPU first.",
      "Prepare the FineWeb-Edu 10B sample with the repo's fineweb.py.",
      "Rent an 8-GPU node only for the final run. llm.c's write-up did it in about 90 minutes for about $20 on 8 A100s.",
    ],
    done: "Your loss and HellaSwag curves sit next to the reference lines in Karpathy's video.",
    further: "Train past 10B tokens, or try one change from Day 7, such as RoPE, and see whether HellaSwag moves.",
    prompt:
      "I am about to reproduce GPT-2 124M with karpathy/build-nanogpt. Before I rent GPUs, quiz me on the run: tokens per step, gradient accumulation steps for my batch, the learning-rate schedule, what bf16 and torch.compile change and what my loss should be at step 0. Correct me after each answer.",
  },
  {
    id: "no-framework",
    title: "A GPT with no framework",
    size: "week",
    topics: ["inside", "training"],
    days: [2, 4, 5],
    starter: true,
    make: "The forward and backward pass of your tiny GPT in plain NumPy, or TypeScript like this site's engine, checked against PyTorch.",
    why: "Nothing proves you understand a transformer like computing its gradients by hand and getting them right.",
    start: [
      "Load the weights tiny_gpt.py saved (tiny_gpt.pt) into NumPy arrays.",
      "Write the forward pass with dropout off and check your logits match PyTorch's to five decimal places.",
      "Write backward one operation at a time, each checked against numerical gradients, then train.",
    ],
    done: "One full training step in your code produces the same gradients as PyTorch.",
    further: "Port it to TypeScript and train it in a Web Worker, the way the Day 5 lab on this site does.",
    prompt:
      "I am writing a GPT's backward pass in NumPy. Do not write it for me. I will paste one operation at a time (embedding, LayerNorm, attention with mask, softmax cross-entropy). For each, check my gradient formula, give me a tiny test case, and point at any shape bug.",
  },
  {
    id: "modernise",
    title: "Modernise your GPT",
    size: "week",
    topics: ["inside"],
    days: [7],
    starter: true,
    make: "tiny_gpt.py upgraded with RMSNorm, RoPE, SwiGLU and grouped-query attention, one change at a time, with a table of what each did.",
    why: "These are the changes between GPT-2 and today's open models. Adding them one by one shows what each one is for.",
    start: [
      "Swap LayerNorm for RMSNorm and rerun. Change nothing else.",
      "Remove the position table and apply RoPE to q and k inside attention.",
      "Swap the MLP for SwiGLU at the same parameter count, then share key and value heads for GQA.",
    ],
    done: "You have a table of each change, its parameter count, its val loss and whether it helped at this size.",
    further: "Train with a longer context than you trained on and compare how RoPE and the learned table degrade.",
    prompt:
      "I am adding RMSNorm, RoPE, SwiGLU and grouped-query attention to a small GPT, one at a time. For each, ask me to explain what it changes and why, then review the code I paste. For SwiGLU, make me work out the hidden size that keeps the parameter count equal to a 4x GELU MLP.",
  },
  {
    id: "tiny-moe",
    title: "A tiny mixture of experts",
    size: "week",
    topics: ["inside"],
    days: [7],
    starter: true,
    make: "The MLP in tiny_gpt.py replaced by 4 to 8 experts with a top-2 router, and a chart of how many tokens each expert gets.",
    why: "Most large models today are mixtures of experts. Watching a router collapse onto one expert, then fixing it, teaches why.",
    start: [
      "A router: a Linear layer from C to the number of experts, a softmax, the top 2, renormalised.",
      "Run each expert on only the tokens sent to it and add up the weighted outputs.",
      "Log tokens per expert every 100 steps, then add the load-balancing loss and compare.",
    ],
    done: "You have two charts: experts collapsing without the balancing loss, and staying balanced with it.",
    further: "Compare total and active parameters with the dense model, and check val loss at equal compute per token.",
    prompt:
      "Help me design a mixture-of-experts layer for a small PyTorch GPT: 4 experts, top-2 routing, and the Switch Transformer load-balancing loss. Explain each line of the routing code, then ask me what total and active parameters will be for my config.",
  },
  {
    id: "rl-sums",
    title: "Reinforcement learning with a checker",
    size: "week",
    topics: ["post-training"],
    days: [7],
    starter: true,
    make: "The sums model from \"Teach a tiny model to answer\", improved further with group-relative RL: reward 1 for a right answer, 0 for a wrong one.",
    why: "It is how reasoning models are trained, at a size where you can watch every number.",
    start: [
      "For each question, sample 8 answers from your model.",
      "Score each 1 or 0 with a checker, then subtract the group's mean reward to get each answer's advantage.",
      "Loss is minus the advantage times the sum of the answer's log-probabilities. Step, then repeat.",
    ],
    done: "Accuracy on held-out sums goes up, and you can explain why groups that are all right or all wrong teach nothing.",
    further: "Make the sums harder until accuracy starts near 30%, and see whether RL learns faster there than on easy sums.",
    prompt:
      "I have a small GPT that answers addition questions after SFT. Help me write one step of group-relative RL in PyTorch: sample 8 answers per question, reward 1 or 0, advantages relative to the group mean, and the policy-gradient loss on the answer tokens only. Then ask me why the all-correct groups give zero gradient.",
  },
];

/** What the starter printed on an ordinary laptop CPU, from a real run. */
export const STARTER_RUN = {
  machine: "a laptop CPU, no GPU",
  header: ["1,115,394 characters, a vocabulary of 65", "0.82M parameters, training on cpu", "Predicted loss at step 0: ln(65) = 4.17"],
  steps: [
    { step: 0, train: 4.209, val: 4.21, s: 1 },
    { step: 250, train: 2.288, val: 2.301, s: 14 },
    { step: 500, train: 2.007, val: 2.072, s: 28 },
    { step: 750, train: 1.87, val: 1.988, s: 42 },
    { step: 1000, train: 1.758, val: 1.905, s: 55 },
    { step: 1250, train: 1.704, val: 1.847, s: 69 },
    { step: 1500, train: 1.657, val: 1.823, s: 83 },
    { step: 1750, train: 1.618, val: 1.792, s: 99 },
    { step: 2000, train: 1.568, val: 1.746, s: 113 },
  ],
  sample: `AUTOLYCUS:
God what I did I will of you are next our that upen 'tis nange,
But I would you daughter to than them to faiture heart,
As he and fair world; our grace quillous:

LEONTES:
Hads may who lord, sir, and the earth.`,
};

export const BASELINE_VAL = 1.746;

export interface Variant {
  id: string;
  /** The edit, as it appears in tiny_gpt.py. */
  change: string;
  what: string;
  predict: string;
  /** Final val loss of our run with this one change. */
  val: number;
  saw: string;
  sample?: string;
}

export const VARIANTS: Variant[] = [
  {
    id: "ctx8",
    change: "block_size = 8",
    what: "The model can now see only the last 8 characters, about a word and a half.",
    predict: "Higher or lower than 1.75, and by how much? What will it still get right?",
    val: 2.175,
    saw: "Much worse. It still makes speaker names and line breaks, because those are short-range patterns, but words fall apart halfway through: by the end of a long word, its start has scrolled out of view.",
    sample: "MENENENIUS:\nCut heace goue.\nThere in is of in for saint the brith a of to be itre meered if sake!",
  },
  {
    id: "layer1",
    change: "n_layer = 1",
    what: "One block instead of four: 0.22M parameters instead of 0.82M.",
    predict: "A quarter of the depth and a quarter of the parameters. How much worse is the val loss?",
    val: 1.771,
    saw: "Barely worse, which surprises most people. In 2,000 steps the four-block model has not had time to use its extra depth. We trained both for 6,000 steps: one block stalled at 1.70, four blocks kept going to 1.57. Bigger wins, but only once it gets enough training.",
    sample: "MENENIUS:\nTyrath, I press him joy'd, at you are to enting to grace.\n\nLADY CAPULET:\nMy lords, thou shall not; have my king?",
  },
  {
    id: "nopos",
    change: "x = self.tok(idx)",
    what: "Drop the position embeddings, so the model gets the characters but not their order.",
    predict: "Without positions, is attention lost completely, or does it still work somehow?",
    val: 1.951,
    saw: "Worse, but far from lost. The causal mask leaks some order on its own: position 5 sees 5 characters, position 60 sees 60, and the model can learn to tell those apart. Spelling suffers most.",
    sample: "An for what his thank dallifes of of the knowbtler and and feather\nand we to the your palete of to goood and slains",
  },
  {
    id: "lr",
    change: "lr = 1e-2",
    what: "A learning rate ten times higher. Each step moves the weights ten times further.",
    predict: "Faster learning or a mess? Where does the loss end up after 2,000 steps?",
    val: 2.693,
    saw: "Stuck. It dropped to 2.74 by step 250 and then wandered there for the rest of the run, worse than the Day 3 bigram model. The steps overshoot, so it never settles into the narrow valleys where better weights are. Try 3e-3 to find the edge.",
    sample: "GIDEIN:\nRE\nMlurld nondalsifls owoun, hiu p baler se had uees 'te anang we t teay this atte osrove",
  },
  {
    id: "nomask",
    change: "delete the masked_fill line",
    what: "Remove the causal mask, so every position can also see the characters after it.",
    predict: "The loss falls to a number below anything you have seen this week. Will the text be good?",
    val: 0.042,
    saw: "The best loss of the whole page and the worst model. During training it just copied the answer from the next position, which is right there in its input. At generation time there is no next position to copy, so it prints almost nothing but newlines.",
    sample: "(about 500 newlines, with two capital Ls somewhere in the middle)",
  },
];
