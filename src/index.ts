import {
	ExtensionContext,
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	services,
	workspace,
} from "coc.nvim";
import { existsSync } from "fs";
import { join } from "path";

type Architecture = "x64" | "arm64";
type PlatformTriplets = {
	[P in NodeJS.Platform]?: {
		[A in Architecture]: {
			triplet: string;
			package: string;
		};
	};
};

const PLATFORMS: PlatformTriplets = {
	win32: {
		x64: {
			triplet: "x86_64-pc-windows-msvc",
			package: "@rometools/cli-win32-x64/rome.exe",
		},
		arm64: {
			triplet: "aarch64-pc-windows-msvc",
			package: "@rometools/cli-win32-arm64/rome.exe",
		},
	},
	darwin: {
		x64: {
			triplet: "x86_64-apple-darwin",
			package: "@rometools/cli-darwin-x64/rome",
		},
		arm64: {
			triplet: "aarch64-apple-darwin",
			package: "@rometools/cli-darwin-arm64/rome",
		},
	},
	linux: {
		x64: {
			triplet: "x86_64-unknown-linux-gnu",
			package: "@rometools/cli-linux-x64/rome",
		},
		arm64: {
			triplet: "aarch64-unknown-linux-gnu",
			package: "@rometools/cli-linux-arm64/rome",
		},
	},
};

function resolveRomeBin(): string {
	// 1. rome.bin in coc-settings
	// 2. local node_modules
	const cfg = workspace.getConfiguration("rome");
	let bin = cfg.get<string | null>("bin", null);
	if (bin && existsSync(bin)) {
		return bin;
	}

	bin = join(workspace.root, "node_modules", "rome", "bin", "rome");
	if (existsSync(bin)) {
		const packageName = PLATFORMS[process.platform]?.[process.arch]?.package;
		return join(workspace.root, "node_modules", packageName);
	}
	return "";
}

export async function activate(context: ExtensionContext): Promise<void> {
	const enable = workspace.getConfiguration("rome").get<boolean>("enable");
	if (!enable) {
		return;
	}

	const command = resolveRomeBin();
	if (!command) {
		return;
	}

	const serverOptions: ServerOptions = { command, args: ["lsp-proxy"] };
	const clientOptions: LanguageClientOptions = {
		progressOnInitialization: true,
		documentSelector: [
			{ scheme: "file", language: "javascript" },
			{ scheme: "file", language: "javascriptreact" },
			{ scheme: "file", language: "typescript" },
			{ scheme: "file", language: "typescriptreact" },
		],
	};

	const client = new LanguageClient("rome", serverOptions, clientOptions);
	context.subscriptions.push(services.registLanguageClient(client));
}
