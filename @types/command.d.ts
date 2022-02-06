type CommandExport = {
	execute: (
		interaction: import("../discord-api-types/v9").APIInteraction,
	) => Promise<import("../discord-api-types/v9").APIInteractionResponse | void>;
};
