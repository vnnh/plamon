require("dotenv").config();

const GUILD_ID = "";

const { getCommands } = require("./index");
const { endpoint } = require("../constant");
(async () => {
	let existingGlobalCommands = await getCommands(
		`${endpoint}/applications/${process.env.CLIENT_ID}/guilds/${GUILD_ID}/commands`,
	);

	existingGlobalCommands.forEach(async (existingDefinition) => {
		console.log(existingDefinition.name);
	});
})();
