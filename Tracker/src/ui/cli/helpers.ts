import chalk from "chalk";
import { Interface } from "readline/promises";

export type MenuOption<T> = {
  label: string;
  value: T;
};

export const selectOption = async <T>(
  rl: Interface,
  question: string,
  options: MenuOption<T>[]
): Promise<T> => {
  const lines = options.map((option, index) => `${index + 1}. ${option.label}`).join("\n");
  const answer = await rl.question(`${chalk.cyan(question)}\n${lines}\n> `);
  const choice = Number(answer.trim());
  if (!Number.isFinite(choice) || choice < 1 || choice > options.length) {
    console.log(chalk.red("Invalid selection"));
    return selectOption(rl, question, options);
  }
  return options[choice - 1].value;
};

export const promptValue = async (rl: Interface, question: string, fallback = "") => {
  const answer = await rl.question(`${chalk.cyan(question)}${fallback ? ` (${fallback})` : ""}\n> `);
  return answer.trim() || fallback;
};

export const pause = async (rl: Interface, message = "Press Enter to continue") => {
  await rl.question(`${chalk.gray(message)}\n`);
};
