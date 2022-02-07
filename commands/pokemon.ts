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
	getPokemonName,
	getResearchTasks,
} from "../util/scraper";
import { endpoint } from "../constant";
import { pokedex } from "../data/pokedex";
import levenshtein from "../util/levenshtein";

const BASE_URL = `https://www.serebii.net`;

export const execute: CommandExport["execute"] = async (interaction) => {
	if (interaction.type === InteractionType.ApplicationCommandAutocomplete) {
		const messageOption = interaction.data?.options!.find((object) => {
			return object.name === "name";
		}) as APIApplicationCommandInteractionDataStringOption | undefined;

		if (messageOption !== undefined) {
			const search = messageOption.value;

			//this has a complete disregard for performance but this is a small bot :)
			const scores = [];

			for (const pokemonName of pokedex) {
				scores.push({ name: pokemonName, score: levenshtein(search, pokemonName) });
			}

			scores.sort();

			return {
				type: InteractionResponseType.ApplicationCommandAutocompleteResult,
				data: {
					choices: scores.slice(0, 25).map((value) => {
						return {
							name: value.name,
							value: value.name,
						};
					}),
				},
			};
		}
	} else if (
		interaction.type === InteractionType.ApplicationCommand &&
		interaction.data.type === ApplicationCommandType.ChatInput
	) {
		const messageOption = interaction.data.options!.find((object) => {
			return object.name === "name";
		}) as APIApplicationCommandInteractionDataStringOption;

		const url = `https://www.serebii.net/pokedex-swsh/${messageOption.value.toLowerCase()}/`;
		const responseEmbed: APIEmbed = {
			title: "title",
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
			const pokemonName = getPokemonName(content);
			const dexNumber = getDexNumber(content);
			const foods = getLikedFood(content);
			const tasks = getResearchTasks(content);
			const relatedMoves = getMovesRelatedToResearchTasks(content, tasks);

			responseEmbed.title = `${pokemonName} ${dexNumber}`;

			responseEmbed.description = `**Tasks**
				${tasks
					.map((value) => {
						return `- ${value.double ? "[2x] " : ""}${value.description}`;
					})
					.join("\n")}`;

			responseEmbed.fields = [];

			if (foods.length > 0) {
				responseEmbed.fields?.push({
					name: "Liked Foods",
					value: foods.map((value) => `[${value.name}](${BASE_URL}${value.href})`).join("\n"),
					inline: true,
				});
			}

			if (locations.length > 0) {
				responseEmbed.fields?.push({
					name: "Locations",
					value: locations
						.map((value) => {
							if (value.regions.length > 0) {
								return `**[${value.name}](${BASE_URL}${value.href})** - ${value.regions
									.map((value) => {
										return `[${value.name}](${BASE_URL}${value.href})`;
									})
									.join(",")}`;
							} else {
								return value.href != ""
									? `**[${value.name}](${BASE_URL}${value.href})**`
									: `**${value.name}**`;
							}
						})
						.join("\n"),
					inline: true,
				});
			}

			if (relatedMoves.length > 0) {
				responseEmbed.fields?.push({
					name: "Moves Related to Tasks",
					value: relatedMoves
						.map((value) => {
							return `${value.name} (${value.levelInfo.join("/")})`;
						})
						.join("\n"),
					inline: true,
				});
			}

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
