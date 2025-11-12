"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pause = exports.promptValue = exports.selectOption = void 0;
const chalk_1 = __importDefault(require("chalk"));
const selectOption = async (rl, question, options) => {
    const lines = options.map((option, index) => `${index + 1}. ${option.label}`).join("\n");
    const answer = await rl.question(`${chalk_1.default.cyan(question)}\n${lines}\n> `);
    const choice = Number(answer.trim());
    if (!Number.isFinite(choice) || choice < 1 || choice > options.length) {
        console.log(chalk_1.default.red("Invalid selection"));
        return (0, exports.selectOption)(rl, question, options);
    }
    return options[choice - 1].value;
};
exports.selectOption = selectOption;
const promptValue = async (rl, question, fallback = "") => {
    const answer = await rl.question(`${chalk_1.default.cyan(question)}${fallback ? ` (${fallback})` : ""}\n> `);
    return answer.trim() || fallback;
};
exports.promptValue = promptValue;
const pause = async (rl, message = "Press Enter to continue") => {
    await rl.question(`${chalk_1.default.gray(message)}\n`);
};
exports.pause = pause;
