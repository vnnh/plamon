import axios from "axios";
import { getElementById } from "domutils";
import { parseDocument } from "htmlparser2";
import {
	APIApplicationCommandInteractionDataStringOption,
	ApplicationCommandType,
	InteractionResponseType,
	InteractionType,
	APIEmbed,
} from "../discord-api-types/v9";
import {
	getDexNumber,
	//getEvolutionInfo,
	getLikedFood,
	getLocations,
	getMovesRelatedToResearchTasks,
	getResearchTasks,
} from "../util/scraper";
import { endpoint } from "../constant";

const BASE_URL = `https://www.serebii.net`;

export const execute: CommandExport["execute"] = async (interaction) => {
	if (interaction.type === InteractionType.ApplicationCommandAutocomplete) {
		const messageOption = interaction.data?.options!.find((object) => {
			return object.name === "name";
		}) as APIApplicationCommandInteractionDataStringOption | undefined;

		if (messageOption !== undefined) {
			//todo autocomplete
		}
	} else if (
		interaction.type === InteractionType.ApplicationCommand &&
		interaction.data.type === ApplicationCommandType.ChatInput
	) {
		const messageOption = interaction.data.options!.find((object) => {
			return object.name === "name";
		}) as APIApplicationCommandInteractionDataStringOption;

		const url = `https://www.serebii.net/pokedex-swsh/${messageOption.value}/`;
		const responseEmbed: APIEmbed = {
			title: messageOption.value,
			url,
		};

		try {
			const response = await axios({
				method: "get",
				url,
			});

			const root = parseDocument(response.data).children.find((value) => {
				return value.name === "html";
			});
			const content = getElementById("content", root!, true)!;

			const locations = getLocations(content);
			//const evolutions = getEvolutionInfo(content); //evolution tree structure on serebii is weird
			const dexNumber = getDexNumber(content);
			const foods = getLikedFood(content);
			const tasks = getResearchTasks(content);
			const relatedMoves = getMovesRelatedToResearchTasks(content, tasks);

			responseEmbed.title += ` ${dexNumber}`;

			responseEmbed.description = `**Tasks**
				${tasks
					.map((value) => {
						return `- ${value.double ? "[2x] " : ""}${value.description}`;
					})
					.join("\n")}`;

			responseEmbed.fields = [
				{
					name: "Liked Foods",
					value: foods.map((value) => `[${value.name}](${BASE_URL}${value.href})`).join("\n"),
					inline: true,
				},
				{
					name: "Locations",
					value: locations
						.map((value) => {
							return `**[${value.name}](${BASE_URL}${value.href})** - ${value.regions
								.map((value) => {
									return `[${value.name}](${BASE_URL}${value.href})`;
								})
								.join(",")}`;
						})
						.join("\n"),
					inline: true,
				},
				{
					name: "Moves Related to Tasks",
					value: relatedMoves
						.map((value) => {
							return `${value.name} (${value.levelInfo.join("/")})`;
						})
						.join("\n"),
					inline: true,
				},
			];

			await axios({
				method: "post",
				url: `${endpoint}/interactions/${interaction.id}/${interaction.token}/callback`,
				data: {
					type: InteractionResponseType.ChannelMessageWithSource,
					data: {
						embeds: [responseEmbed],
					},
				},
			});
		} catch (e) {
			console.log(e);
			console.log(messageOption.value);
			await axios({
				method: "post",
				url: `${endpoint}/interactions/${interaction.id}/${interaction.token}/callback`,
				data: {
					type: InteractionResponseType.ChannelMessageWithSource,
					data: {
						embeds: [{ description: `${messageOption.value} is not a Pokemon` }],
					},
				},
			});
		}

		return;
	}
};
