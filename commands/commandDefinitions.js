const { ApplicationCommandOptionType } = require("../discord-api-types/v9");

module.exports = {
	pokemon: {
		name: "pokemon",
		description: "get information on a pokemon",
		options: [
			{
				type: ApplicationCommandOptionType.String,
				name: "name",
				description: "pokemon name",
				required: true,
				autocomplete: true,
			},
		],
	},
};
