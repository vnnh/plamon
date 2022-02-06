require("dotenv").config();

const axios = require("axios");
const commandDefinitions = require("../commands/commandDefinitions");
const { authorizationHeader } = require("../constant");

const getCommands = async (url) => {
	const commands = await axios({
		method: "get",
		url: url,
		headers: {
			Authorization: authorizationHeader,
		},
	});

	return commands.data;
};

const modifyCommand = async (url, RESTMethod, data) => {
	await axios({
		method: RESTMethod,
		url: url,
		headers: {
			Authorization: authorizationHeader,
		},
		data: data,
	});
};

const deleteCommand = async (commandId, commandsURL, props) => {
	await modifyCommand(commandsURL + `/${commandId}`, "delete", props);
};

const deleteOldCommands = async (existingCommands, commandsURL, _customCommandDefinitions) => {
	let newCommands = [];

	existingCommands.forEach(async (existingDefinition) => {
		const newDefinition = (_customCommandDefinitions || commandDefinitions)[existingDefinition.name];

		if (
			!newDefinition ||
			newCommands.find((obj) => {
				//delete duplicates
				return obj.name === existingDefinition.name;
			})
		) {
			await deleteCommand(existingDefinition.id, commandsURL, existingDefinition);

			console.log(`| delete ${existingDefinition.name} ✔ |`);
		} else {
			newCommands.push(existingDefinition);
		}
	});

	return newCommands;
};

const addNewCommands = async (existingCommands, commandsURL) => {
	for (let commandName in commandDefinitions) {
		const props = commandDefinitions[commandName];

		const existingDefinition = existingCommands.find((obj) => {
			return obj.name === props.name;
		});

		if (!existingDefinition) {
			modifyCommand(commandsURL, "post", props);
			console.log(`| post ${commandName} ✔ |`);
		} else if (
			existingDefinition.description !== props.description ||
			JSON.stringify(existingDefinition?.options) !== JSON.stringify(props.options)
		) {
			modifyCommand(commandsURL, "patch", props);

			console.log(`| patch ${commandName} ✔ |`);
		}
	}
};

module.exports = {
	getCommands,
	addNewCommands,
	modifyCommand,
	deleteOldCommands,
	deleteCommand,
};
