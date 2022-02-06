require("dotenv").config();

const GUILD_ID = "";

const { getCommands, deleteCommand } = require("./index");
const { endpoint } = require("../constant");
(async () => {
	let existingGlobalCommands = await getCommands(
		`${endpoint}/applications/${process.env.CLIENT_ID}/guilds/${GUILD_ID}/commands`,
	);

	existingGlobalCommands.forEach(async (existingDefinition) => {
		await deleteCommand(
			existingDefinition.id,
			`${endpoint}/applications/${process.env.CLIENT_ID}/guilds/${GUILD_ID}/commands`,
			existingDefinition,
		);

		console.log(`| delete global ${existingDefinition.name} ✔ |`);
	});
})();
