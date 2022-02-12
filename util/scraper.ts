/* eslint-disable @typescript-eslint/ban-ts-comment */
//maybe this could be cleaned up soon tm

import { Element } from "domhandler";
import { find, findOne, getChildren, getElementById, textContent } from "domutils";

const LIMIT = 100;

type Location = {
	name: string;
	href: string;
	regions: { name: string; href: string }[];
};

type Evolution = {
	name: string;
	href: string;
	requirement: string;
	level: number;
};

export const getLocations = (content: Element) => {
	const dexTables = find(
		(element) => {
			return element.name === "table" && element.attribs["class"] === "dextable";
		},
		content.children,
		true,
		LIMIT,
	);

	const locationTableNode = dexTables.find((node) => {
		return !!findOne(
			(element) => {
				return !!textContent(element).match("Locations");
			},
			getChildren(node),
			true,
		);
	});

	const scrapedLocations: Location[] = [];
	findOne(
		(element) => {
			const test =
				element.name === "tr" &&
				!!findOne(
					(element) => {
						return !!textContent(element).match("Legends: Arceus");
					},
					element.children,
					true,
				);

			if (test === true) {
				const infoElement = element.children.find((element) => {
					return "attribs" in element && element.attribs["class"] === "fooinfo";
				});

				let currentMajor = -1;
				for (const element of infoElement!.children) {
					if (!element.prev || element.prev.name === "br") {
						currentMajor += 1;
						scrapedLocations[currentMajor] = {
							name: textContent(element),
							href: element.attribs ? element.attribs.href : "",
							regions: [],
						};
					} else if (element.name === "a") {
						scrapedLocations[currentMajor].regions.push({
							name: textContent(element),
							href: element.attribs ? element.attribs.href : "",
						});
					}
				}
			}

			return test;
		},
		getChildren(locationTableNode!),
		true,
	);

	return scrapedLocations;
};

const capitalizeFirstLetter = (name: string) => {
	return name.charAt(0).toLocaleUpperCase() + name.slice(1);
};

export const getEvolutionInfo = (content: Element) => {
	const dexTables = find(
		(node) => {
			return node.name === "table" && node.attribs["class"] === "dextable";
		},
		content.children,
		true,
		LIMIT,
	);

	const evolutionSectionNode = dexTables.find((node) => {
		return !!findOne(
			(element) => {
				return element.attribs["class"] === "fooevo" && textContent(element) === "Evolutionary Chain";
			},
			getChildren(node),
			true,
		);
	});

	let scrapedEvolutions: Evolution[] = [];
	let evoIndex = 0;

	findOne(
		(element) => {
			const test = element.name === "td" && element.attribs["class"] === "fooinfo";

			if (test === true) {
				const list = element.children.find((element) => element.name === "table")!.children;

				let lastSpanLevel = 0;
				for (const row of list) {
					if (row.name !== "tr") continue;

					let rowIndex = 0;
					for (const element of row.children) {
						//is pokemon element
						if (element.name === "td" && element.attribs["class"] === "pkmn") {
							if (element.attribs["rowspan"]) {
								lastSpanLevel += 1;
							}

							if (!!element.firstChild!.firstChild!.attribs.src.match("-")) {
								continue;
							}

							if (!scrapedEvolutions[evoIndex]) {
								//@ts-ignore
								scrapedEvolutions[evoIndex] = {};
							}

							scrapedEvolutions[evoIndex]["name"] = capitalizeFirstLetter(
								element.firstChild!.attribs.href.match(/\/pokedex-swsh\/(.+)/)![1],
							);
							scrapedEvolutions[evoIndex]["href"] = element.firstChild!.attribs.href;

							if (element.attribs["rowspan"]) {
								scrapedEvolutions[evoIndex]["level"] = lastSpanLevel;
							} else {
								rowIndex += 1;
								scrapedEvolutions[evoIndex]["level"] = lastSpanLevel + rowIndex;
							}
						} else if (element.name === "td") {
							//is transition element
							evoIndex += 1;
							//@ts-ignore
							scrapedEvolutions[evoIndex] = {};

							const container = element;
							if (container.children.length === 0) {
								scrapedEvolutions[evoIndex].requirement = "no requirement";
							} else {
								if (
									element.firstChild!.name === "img" &&
									!!element.firstChild!.attribs.src.match(/\d+/) &&
									(!element.firstChild!.attribs.title ||
										!element.firstChild!.attribs.alt ||
										!element.firstChild!.attribs.title.match(/Level \d/) ||
										!element.firstChild!.attribs.alt.match(/Level \d/))
								) {
									const pre =
										element.firstChild!.attribs.title ||
										element.firstChild!.attribs.alt ||
										"Level ";

									scrapedEvolutions[evoIndex].requirement = `${pre}${
										element.firstChild!.attribs.src.match(/(\d+)/)![1]
									}`;
								} else if (element.firstChild?.attribs?.title) {
									scrapedEvolutions[evoIndex].requirement = element.firstChild.attribs.title.replace(
										/ +(?= )/g,
										"",
									);
								} else if (element.firstChild!.firstChild?.attribs?.alt) {
									scrapedEvolutions[evoIndex].requirement =
										element.firstChild!.firstChild.attribs.alt.replace(/ +(?= )/g, "");
								} else if (element.firstChild!.firstChild?.attribs?.title) {
									//the regex replace is for Scizor, which has a double space ('Trade with  Metal Coat')
									scrapedEvolutions[evoIndex].requirement =
										element.firstChild!.firstChild.attribs.title.replace(/ +(?= )/g, "");
								}
							}

							scrapedEvolutions[evoIndex].requirement = scrapedEvolutions[evoIndex].requirement.replace(
								"�",
								"e",
							);
						}
					}
				}
			}

			return false;
		},
		getChildren(evolutionSectionNode!),
		true,
	);

	scrapedEvolutions = scrapedEvolutions.filter((value) => value.name);

	return scrapedEvolutions;
};

export const getRelativePokemonImage = (content: Element) => {
	const dexTables = find(
		(node) => {
			return node.name === "table" && node.attribs["class"] === "dextable";
		},
		content.children,
		true,
		LIMIT,
	);

	const sprite: string[] = [];
	dexTables.find((node) => {
		return !!findOne(
			(element) => {
				const test = element.name === "td" && element.attribs && element.attribs["class"] === "pkmn";

				if (test === true && element.children) {
					for (const node of element.children) {
						if (node.name === "img" && node.attribs) {
							for (const [attribName, attribValue] of Object.entries(node.attribs)) {
								if (typeof attribValue === "string") {
									if (!!attribValue.toLowerCase().match("sprite")) {
										sprite.push(node.attribs.src);
										break;
									}
								}
							}
						}
					}
				}

				return false;
			},
			getChildren(node),
			true,
		);
	});

	return sprite;
};

export const getPokemonName = (content: Element) => {
	const dexTables = find(
		(node) => {
			return node.name === "table" && node.attribs["class"] === "dextable";
		},
		content.children,
		true,
		LIMIT,
	);

	const dexInfoNode = dexTables.find((node) => {
		return !!findOne(
			(element) => {
				return !!findOne(
					(element) => {
						return element.name === "td" && !!textContent(element).match("No.");
					},
					getChildren(element),
					true,
				);
			},
			getChildren(node),
			true,
		);
	});

	return textContent(
		findOne(
			(element) => {
				return element.name === "td" && element.attribs && element.attribs["class"] === "fooinfo";
			},
			getChildren(dexInfoNode!),
			true,
		)!,
	).trim();
};

export const getDexNumber = (content: Element) => {
	const dexTables = find(
		(node) => {
			return node.name === "table" && node.attribs["class"] === "dextable";
		},
		content.children,
		true,
		LIMIT,
	);

	const dexInfoNode = dexTables.find((node) => {
		return !!findOne(
			(element) => {
				return !!findOne(
					(element) => {
						return element.name === "td" && !!textContent(element).match("No.");
					},
					getChildren(element),
					true,
				);
			},
			getChildren(node),
			true,
		);
	});

	const text = textContent(
		findOne(
			(element) => {
				return element.name === "td" && !!textContent(element).match("Hisui");
			},
			getChildren(dexInfoNode!),
			true,
		)!.firstChild!.children!.find((value) => {
			return !!textContent(value).match("Hisui");
		})!,
	).trim();

	const dexNumberMatch = text.match(/\#\d+/g);
	return dexNumberMatch ? dexNumberMatch[0] : "#000";
};

export const getLikedFood = (content: Element) => {
	const dexTables = find(
		(node) => {
			return node.name === "table" && node.attribs["class"] === "dextable";
		},
		content.children,
		true,
		LIMIT,
	);

	const foodTable = findOne(
		(element) => {
			return !!findOne(
				(element) => {
					return element.name === "td" && !!textContent(element).match("Liked Food");
				},
				element.children,
				true,
			);
		},
		dexTables,
		true,
	);

	if (!foodTable) {
		return [];
	}

	const foods = find(
		(element) => {
			return element.attribs && element.attribs.class === "cen";
		},
		foodTable!.children,
		true,
		LIMIT,
	);

	return foods.map((val) => {
		return {
			name: textContent(val),
			href: val.children.find((value) => {
				return value.name === "a";
			})!.attribs.href,
		};
	});
};

export const getResearchTasks = (content: Element) => {
	const dexTables = find(
		(node) => {
			return node.name === "table" && node.attribs["class"] === "dextable";
		},
		content.children,
		true,
		LIMIT,
	);

	const taskTable = findOne(
		(element) => {
			return !!findOne(
				(element) => {
					return element.name === "td" && !!textContent(element).match("Research Tasks");
				},
				element.children,
				true,
			);
		},
		dexTables,
		true,
	);

	const tasks = find(
		(element) => {
			return element.name === "tr" && !!element.attribs.height;
		},
		taskTable!.children,
		true,
		LIMIT,
	);

	return tasks.map((value) => {
		return {
			double: !!findOne(
				(element) => {
					return (
						element.name === "td" &&
						!!element.children.find((element) => {
							return element.name === "img" && !!element.attribs.title.match("Research Level Boost");
						})
					);
				},
				value.children,
				true,
			),
			description: textContent(
				find(
					(element) => {
						return (
							element.name === "td" &&
							element.attribs &&
							element.attribs.class === "fooinfo" &&
							!!element.attribs.width
						);
					},
					value.children,
					true,
					LIMIT,
				),
			).trim(),
		};
	});
};

export const getMovesRelatedToResearchTasks = (content: Element, tasks: ReturnType<typeof getResearchTasks>) => {
	const dexTables = find(
		(node) => {
			return node.name === "table" && node.attribs["class"] === "dextable";
		},
		content.children,
		true,
		LIMIT,
	);

	const moveTable = findOne(
		(element) => {
			return (
				!!findOne(
					(element) => {
						return (
							element.name === "td" &&
							(!!textContent(element).match("Standard Level Up") ||
								!!textContent(element).match("Hisuian Form Level Up"))
						);
					},
					element.children,
					true,
				) &&
				(!getElementById("swshbdsp", content) || element.parent!.attribs.id === "legends")
			);
		},
		dexTables,
		true,
	);

	const moveList = [];
	for (const task of tasks) {
		const moveMatch = task.description.match(/use (.*)$/i);
		if (moveMatch) {
			const move = moveMatch[1];

			const entry = findOne(
				(element) => {
					return (
						element.name === "tr" &&
						!!findOne(
							(element) => {
								return !!textContent(element).trim().match(move);
							},
							element.children,
							true,
						)
					);
				},
				moveTable!.children,
				true,
			);

			if (!entry) {
				continue;
			}

			const learnLevelList = findOne(
				(element) => {
					return (
						element.name === "td" &&
						(!!textContent(element).match("—") ||
							!!element.children.find((value) => {
								return value.name === "br";
							}))
					);
				},
				entry.children,
				true,
			);

			const levels = [];

			for (const level of learnLevelList!.children) {
				const text = textContent(level);
				if (text.trim() != "") {
					levels.push(text);
				}
			}

			moveList.push({
				name: move,
				levelInfo: levels,
			});
		}
	}

	return moveList;
};
