import {exec} from "child_process";
import {
	ExtensionContext,
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	TransportKind,
	commands,
	services,
	window,
	workspace,
} from "coc.nvim";
import {existsSync} from "fs";
import {join} from "path";
import {promisify} from "util";
import which from "which";

function resolveRomeBin(): string {
	// 1. rome.bin in coc-settings
	// 2. $PATH
	// 3. local node_modules
	const cfg = workspace.getConfiguration("rome");
	let bin = cfg.get<string>("bin");
	if (bin && existsSync(bin)) {
		return bin;
	}

	bin =
		which.sync("rome", {nothrow: true}) ||
		join(workspace.root, "node_modules", "rome", "bin", "rome", "index.js");
	if (bin && existsSync(bin)) {
		return bin;
	}

	return "";
}

async function romeInit(): Promise<void> {
	const prompt = await window.showPrompt(
		`Rome is found in your project, but configuration is missing, would you like to do 'rome init'?`,
	);
	if (!prompt) {
		return;
	}

	const bin = resolveRomeBin();
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

	const bin = resolveRomeBin();
	if (!bin) {
		return;
	}

	const rjson = join(workspace.root, ".config", "rome.rjson");
	if (!existsSync(rjson)) {
		await romeInit();
	}

	const serverOptions: ServerOptions = {
		module: bin,
		args: ["lsp"],
		transport: TransportKind.stdio,
	};

	const clientOptions: LanguageClientOptions = {
		outputChannel: window.createOutputChannel("Rome"),
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
				window.showMessage(stdout);
			},
		),
	);
}
