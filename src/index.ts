import {
	ExtensionContext,
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	TransportKind,
	services,
	workspace,
} from "coc.nvim";
import {existsSync} from "fs";
import {join} from "path";

export async function activate(context: ExtensionContext): Promise<void> {
	const cfg = workspace.getConfiguration("rome");
	const enabled = (cfg.get("enabled") as boolean);
	if (!enabled) {
		return;
	}

	const module = join(
		workspace.root,
		"node_modules",
		"rome",
		"bin",
		"rome",
		"index.js",
	);
	if (!existsSync(module)) {
		workspace.showMessage("No rome found in your project root.", "warning");
		return;
	}

	const rjson = join(workspace.root, ".config/rome.rjson");
	if (!existsSync(rjson)) {
		const prompt = await workspace.showPrompt(
			`Rome is found in your project, but configuration is missing, would you like to do 'rome init'?`,
		);
		if (!prompt) {
			return;
		}

		const terminal = await workspace.createTerminal({cwd: workspace.root});
		terminal.sendText(`${module} init`);
		await terminal.show(true);
	}

	const serverOptions: ServerOptions = {
		module,
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
}
