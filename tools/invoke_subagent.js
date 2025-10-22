"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const AGENTS_FOLDER = '.gemini/agents';
const DEFAULT_MODEL = 'gemini-flash-latest';
const VERSION = '1.0.0';
function validateAgentType(type) {
    // Only allow alphanumeric characters, hyphens, and underscores
    const validPattern = /^[a-zA-Z0-9_-]+$/;
    return validPattern.test(type) && type.length > 0 && type.length <= 50;
}
function showHelp() {
    console.log(`
invoke_subagent - Invoke AI sub-agents via gemini headless tool

Usage:
  ./tools/invoke_subagent [options]

Options:
  -t, --type <type>      Type of sub-agent to invoke (required)
  -p, --prompt <text>    Prompt to pass to the sub-agent (optional)
  -m, --model <model>    Model to use (default: ${DEFAULT_MODEL})
  -d, --debug            Enable debug output (shows command details)
  -h, --help             Show this help message
  -v, --version          Show version number

Examples:
  ./tools/invoke_subagent -t code_reviewer -p "review all pending changes"
  ./tools/invoke_subagent --type code_reviewer --model gemini-flash-latest
  ./tools/invoke_subagent -t technical_researcher --prompt "research React 19" -m gemini-flash-latest --debug
`);
}
function showVersion() {
    console.log(`invoke_subagent version ${VERSION}`);
}
function parseArgs() {
    const args = {
        model: DEFAULT_MODEL,
    };
    for (let i = 2; i < process.argv.length; i++) {
        const arg = process.argv[i];
        const nextArg = process.argv[i + 1];
        switch (arg) {
            case '-t':
            case '--type':
                if (!nextArg || nextArg.startsWith('-')) {
                    console.error('Error: --type requires a value');
                    process.exit(1);
                }
                if (!validateAgentType(nextArg)) {
                    console.error('Error: --type must contain only alphanumeric characters, hyphens, and underscores');
                    process.exit(1);
                }
                args.type = nextArg;
                i++;
                break;
            case '-p':
            case '--prompt':
                if (!nextArg || nextArg.startsWith('-')) {
                    console.error('Error: --prompt requires a value');
                    process.exit(1);
                }
                args.prompt = nextArg;
                i++;
                break;
            case '-m':
            case '--model':
                if (!nextArg || nextArg.startsWith('-')) {
                    console.error('Error: --model requires a value');
                    process.exit(1);
                }
                args.model = nextArg;
                i++;
                break;
            case '-d':
            case '--debug':
                args.debug = true;
                break;
            case '-h':
            case '--help':
                args.help = true;
                break;
            case '-v':
            case '--version':
                args.version = true;
                break;
            default:
                console.error(`Error: Unknown option '${arg}'`);
                showHelp();
                process.exit(1);
        }
    }
    return args;
}
function main() {
    const args = parseArgs();
    if (args.help) {
        showHelp();
        process.exit(0);
    }
    if (args.version) {
        showVersion();
        process.exit(0);
    }
    if (!args.type) {
        console.error('Error: --type is required');
        showHelp();
        process.exit(1);
    }
    // Get the project root (current working directory)
    const projectRoot = process.cwd();
    // Build the agent file path
    const agentFilePath = path.join(projectRoot, AGENTS_FOLDER, `${args.type}.md`);
    if (args.debug) {
        console.log('[DEBUG] Project root:', projectRoot);
        console.log('[DEBUG] Agent file path:', agentFilePath);
    }
    // Read the sub-agent file (atomic operation, prevents TOCTOU)
    let agentContent;
    try {
        agentContent = fs.readFileSync(agentFilePath, 'utf-8');
        if (args.debug) {
            console.log('[DEBUG] Agent file size:', agentContent.length, 'bytes');
        }
        if (agentContent.trim() === '') {
            console.error(`Error: Sub-agent file is empty: ${agentFilePath}`);
            process.exit(1);
        }
    }
    catch (error) {
        if (error.code === 'ENOENT') {
            console.error(`Error: Sub-agent type (${args.type}) not found.`);
            console.error(`Expected file: ${agentFilePath}`);
        }
        else if (error.code === 'EACCES') {
            console.error(`Error: Permission denied reading: ${agentFilePath}`);
        }
        else {
            console.error(`Error reading agent file: ${error.message}`);
        }
        process.exit(1);
    }
    // Build command arguments (prevents injection)
    const geminiArgs = ['--yolo', '--model', args.model];
    // Add prompt if provided
    if (args.prompt && args.prompt.trim() !== '') {
        geminiArgs.push('--prompt', args.prompt);
    }
    if (args.debug) {
        console.log('[DEBUG] Command: gemini', geminiArgs.join(' '));
        console.log('[DEBUG] Full command line:', `cat "${agentFilePath}" | gemini ${geminiArgs.join(' ')}`);
        console.log();
    }
    console.log(`Invoking gemini with agent: ${args.type}`);
    if (args.prompt) {
        const displayPrompt = args.prompt.length > 50
            ? args.prompt.substring(0, 50) + '...'
            : args.prompt;
        console.log(`Prompt: ${displayPrompt}`);
    }
    console.log();
    // Spawn the gemini process
    const geminiProcess = (0, child_process_1.spawn)('gemini', geminiArgs, {
        stdio: ['pipe', 'inherit', 'inherit'],
        cwd: projectRoot,
    });
    // Write agent content to stdin and close
    geminiProcess.stdin.write(agentContent);
    geminiProcess.stdin.end();
    // Handle errors
    geminiProcess.on('error', (error) => {
        if (error.code === 'ENOENT') {
            console.error(`\nError: Command 'gemini' not found in PATH`);
            console.error('Please ensure gemini CLI is installed and accessible');
        }
        else if (error.code === 'EACCES') {
            console.error(`\nError: Permission denied executing command`);
        }
        else {
            console.error(`\nError executing command: ${error.message}`);
        }
        process.exit(1);
    });
    // Handle exit
    geminiProcess.on('exit', (code) => {
        process.exit(code || 0);
    });
}
main();
