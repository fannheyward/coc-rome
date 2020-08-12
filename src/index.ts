import {exec} from "child_process";
import {
	ExtensionContext,
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	TransportKind,
	commands,
	services,
	workspace,
} from "coc.nvim";
import {existsSync} from "fs";
import {join} from "path";
import {promisify} from "util";

const bin = join(
	workspace.root,
	"node_modules",
	"rome",
	"bin",
	"rome",
	"index.js",
);

async function romeInit(): Promise<void> {
	const prompt = await workspace.showPrompt(
		`Rome is found in your project, but configuration is missing, would you like to do 'rome init'?`,
	);
	if (!prompt) {
		return;
	}

	const terminal = await workspace.createTerminal({cwd: workspace.root});
	terminal.sendText(`${bin} init`);
	await terminal.show(true);
}

export async function activate(context: ExtensionContext): Promise<void> {
	const cfg = workspace.getConfiguration("rome");
	const enable = (cfg.get("enable") as boolean);
	if (!enable) {
		return;
	}

	if (!existsSync(bin)) {
		workspace.showMessage("No rome found in your project root.", "warning");
		return;
	}

	const rjson = join(workspace.root, ".config/rome.rjson");
	if (!existsSync(rjson)) {
		await romeInit();
	}

	const serverOptions: ServerOptions = {
		module: bin,
		args: ["lsp"],
		transport: TransportKind.stdio,
	};

	const clientOptions: LanguageClientOptions = {
		outputChannel: workspace.createOutputChannel("Rome"),
		progressOnInitialization: true,
		documentSelector: [
			{scheme: "file", language: "javascript"},
			{scheme: "file", language: "javascriptreact"},
			{scheme: "file", language: "typescript"},
			{scheme: "file", language: "typescriptreact"},
			{scheme: "file", language: "json"},
		],
	};

	const client = new LanguageClient(
		"rome",
		"Rome",
		serverOptions,
		clientOptions,
	);
	context.subscriptions.push(services.registLanguageClient(client));

	context.subscriptions.push(
		commands.registerCommand(
			"rome.cacheClear",
			async () => {
				const {stdout} = await promisify(exec)(`${bin} cache clear`);
				workspace.showMessage(stdout);
			},
		),
	);
}
