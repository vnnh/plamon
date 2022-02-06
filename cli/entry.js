require("dotenv").config();

const { getCommands, deleteOldCommands, addNewCommands } = require(".");
const { endpoint } = require("../constant");

const immediateServers = [];

const pause = require("../util/pause");

(async () => {
	let existingGlobalCommands = await getCommands(`${endpoint}/applications/${process.env.CLIENT_ID}/commands`);
	/*existingGlobalCommands = await deleteOldCommands(
		existingGlobalCommands,
		`${endpoint}/applications/${process.env.CLIENT_ID}/commands`,
	);*/
	addNewCommands(existingGlobalCommands, `${endpoint}/applications/${process.env.CLIENT_ID}/commands`);

	pause(1);
	immediateServers.forEach(async (guildId) => {
		let existingGuildCommands = await getCommands(
			`${endpoint}/applications/${process.env.CLIENT_ID}/guilds/${guildId}/commands`,
		);
		existingGuildCommands = await deleteOldCommands(
			existingGuildCommands,
			`${endpoint}/applications/${process.env.CLIENT_ID}/guilds/${guildId}/commands`,
			{},
		);
		/*addNewCommands(
			existingGuildCommands,
			`${endpoint}/applications/${process.env.CLIENT_ID}/guilds/${guildId}/commands`
		);*/
		pause(1);
	});
})();
