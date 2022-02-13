import axios from "axios";
import sharp from "sharp";
import Vibrant from "node-vibrant";
import converter from "hex2dec";
import { getElementById } from "domutils";
import { parseDocument } from "htmlparser2";
import {
	APIApplicationCommandInteractionDataStringOption,
	ApplicationCommandType,
	InteractionResponseType,
	InteractionType,
	APIEmbed,
} from "discord-api-types/v9";
import {
	getDexNumber,
	getEvolutionInfo,
	getLikedFood,
	getLocations,
	getMovesRelatedToResearchTasks,
	getPokemonName,
	getRelativePokemonImage,
	getResearchTasks,
} from "../util/scraper";
import { endpoint } from "../constant";
import { pokedex } from "../data/pokedex";
import levenshtein from "../util/levenshtein";
import FormData from "form-data";

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
				scores.push({ name: pokemonName, score: levenshtein(search.toLowerCase(), pokemonName.toLowerCase()) });
			}

			scores.sort((a, b) => {
				return a.score - b.score;
			});

			return {
				type: InteractionResponseType.ApplicationCommandAutocompleteResult,
				data: {
					choices: scores.slice(0, 5).map((value) => {
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

		const formData = new FormData();

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
			const evolutions = getEvolutionInfo(content); //evolution tree structure on serebii is weird
			const relativePokemonImagePaths = getRelativePokemonImage(content);
			const pokemonName = getPokemonName(content);
			const dexNumber = getDexNumber(content);
			const foods = getLikedFood(content);
			const tasks = getResearchTasks(content);
			const relatedMoves = getMovesRelatedToResearchTasks(content, tasks);

			const baseImage = sharp({
				create: { width: 200, height: 100, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
			});

			const normalSpriteBuffer = (
				await axios({
					url: `${BASE_URL}${relativePokemonImagePaths[0]}`,
					method: "get",
					responseType: "arraybuffer",
				})
			).data;
			const normalSprite = sharp(normalSpriteBuffer).resize(100, 100);
			const shinySprite = sharp(
				(
					await axios({
						url: `${BASE_URL}${relativePokemonImagePaths[1]}`,
						method: "get",
						responseType: "arraybuffer",
					})
				).data,
			).resize(100, 100);

			const finalImageBuffer = await baseImage
				.composite([
					{ input: await normalSprite.toBuffer(), left: 0, top: 0 },
					{ input: await shinySprite.toBuffer(), left: 100, top: 0 },
				])
				.png()
				.toBuffer();

			const dominantColorHex = (await Vibrant.from(normalSpriteBuffer).getPalette()).DarkVibrant!.hex.replace(
				"#",
				"",
			);

			responseEmbed.color = parseInt(converter.hexToDec(dominantColorHex)!);
			responseEmbed.title = `${pokemonName} ${dexNumber}`;
			responseEmbed.thumbnail = {
				url: "attachment://sprite.png",
			};

			responseEmbed.description = `\`Evolution Line\`
			${evolutions
				.map((value) => {
					return `${"-".repeat(value.level)} ${value.requirement ? `${value.requirement}: ` : ``}[${
						value.name
					}](${BASE_URL}${value.href})`;
				})
				.join("\n")}
			\`Tasks\`
				${tasks
					.map((value) => {
						return `- ${value.double ? "[2x] " : ""}${value.description}`;
					})
					.join("\n")}`;

			responseEmbed.fields = [];

			if (foods.length > 0) {
				responseEmbed.fields?.push({
					name: "`Liked Foods`",
					value: foods.map((value) => `[${value.name}](${BASE_URL}${value.href})`).join("\n"),
					inline: true,
				});
			}

			if (locations.length > 0) {
				responseEmbed.fields?.push({
					name: "`Locations`",
					value: locations
						.slice(0, 3)
						.map((value) => {
							if (value.regions.length > 0) {
								return `**[${value.name}](${BASE_URL}${value.href})** - ${value.regions
									.map((value) => {
										return `[${value.name}](${BASE_URL}${value.href})`;
									})
									.join(", ")}`;
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
					name: "`Moves Related to Tasks`",
					value: relatedMoves
						.map((value) => {
							return `${value.name} (${value.levelInfo.join("/")})`;
						})
						.join("\n"),
					inline: true,
				});
			}

			formData.append(
				"payload_json",
				JSON.stringify({
					type: InteractionResponseType.ChannelMessageWithSource,
					data: {
						embeds: [responseEmbed],
						attachments: [
							{
								id: 0,
								description: "sprites",
								filename: "sprite.png",
							},
						],
					},
				}),
			);

			formData.append("files[0]", finalImageBuffer, { filename: "sprite.png" });

			return formData;
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

	return;
};
