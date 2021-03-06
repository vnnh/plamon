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

const interpretEvolutionTransitionElement = (element: Element) => {
	let requirement = "";
	if (element.children.length === 0) {
		requirement = "no requirement";
	} else {
		if (
			element.firstChild!.name === "img" &&
			!!element.firstChild!.attribs.src.match(/\d+/) &&
			(!element.firstChild!.attribs.title ||
				!element.firstChild!.attribs.alt ||
				((!element.firstChild!.attribs.title.match(/Level \d/) ||
					!element.firstChild!.attribs.alt.match(/Level \d/)) &&
					(!element.firstChild!.attribs.title.match(/Level \w/) ||
						!element.firstChild!.attribs.alt.match(/Level \w/))))
		) {
			const pre = element.firstChild!.attribs.title || element.firstChild!.attribs.alt || "Level ";

			requirement = `${pre}${element.firstChild!.attribs.src.match(/(\d+)/)![1]}`;
		} else if (element.firstChild?.attribs?.title) {
			requirement = element.firstChild.attribs.title.replace(/ +(?= )/g, "");
		} else if (element.firstChild!.firstChild?.attribs?.alt) {
			requirement = element.firstChild!.firstChild.attribs.alt.replace(/ +(?= )/g, "");
		} else if (element.firstChild!.firstChild?.attribs?.title) {
			//the regex replace is for Scizor, which has a double space ('Trade with  Metal Coat')
			requirement = element.firstChild!.firstChild.attribs.title.replace(/ +(?= )/g, "");
		}
	}

	return requirement.replace("???", "e");
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

				//eevee has a unique evolution format
				let hasTransitionRow = false;
				const transitionIndices: Evolution[] = [];

				let lastSpanLevel = 0;
				let rowCount = 0;
				let encounteredRootTD = false;
				let rootTDIndex = 0;
				for (const row of list) {
					//eevee page is weird
					if (row.name === "td" && row.attribs["class"] === "pkmn") {
						if (!encounteredRootTD) {
							encounteredRootTD = true;
							rowCount += 1;
						}

						if (!transitionIndices[rootTDIndex]) {
							//@ts-ignore
							transitionIndices[rootTDIndex] = {};
						}

						transitionIndices[rootTDIndex]["name"] = capitalizeFirstLetter(
							row.firstChild!.attribs.href.match(/\/pokedex-swsh\/(.+)/)![1],
						);
						transitionIndices[rootTDIndex]["href"] = row.firstChild!.attribs.href;

						transitionIndices[rootTDIndex]["level"] = rowCount;

						rootTDIndex += 1;
					}

					if (row.name !== "tr") continue;

					const isTransitionRow = !row.children.find((element) => {
						return element.name === "td" && element.attribs["class"] === "pkmn";
					});
					if (!hasTransitionRow) {
						hasTransitionRow = isTransitionRow;
					}

					if (!isTransitionRow) {
						rowCount += 1;
					}

					let rowIndex = 0;
					if (!hasTransitionRow) {
						for (let element of row.children) {
							//is pokemon element
							if (element.name === "td" && element.attribs["class"] === "pkmn") {
								//eevee has a double layer td
								const result = findOne((element) => element.name === "td", element.children, true);
								if (!!result) {
									element = result;
								}

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
								scrapedEvolutions[evoIndex] = {
									requirement: interpretEvolutionTransitionElement(element),
								};
							}
						}
					} else {
						for (const element of row.children) {
							if (element.name === "td" && element.attribs["class"] !== "pkmn") {
								//is transition element
								//@ts-ignore
								transitionIndices.push({
									requirement: interpretEvolutionTransitionElement(element),
								});

								rowIndex += 1;
							}
						}
					}
				}

				scrapedEvolutions = scrapedEvolutions.concat(transitionIndices);
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
						(!!textContent(element).match("???") ||
							!!element.children.find((value) => {
								return value.name === "br";
							}) ||
							(element.children.length < 2 && !!textContent(element).match(/^\d+$/)))
					);
				},
				entry.children,
				true,
			);

			const levels = [];

			if (learnLevelList!.children.length < 2 && !!textContent(learnLevelList!).match(/^\d+$/)) {
				levels.push(textContent(learnLevelList!));
			} else {
				for (const level of learnLevelList!.children) {
					const text = textContent(level);
					if (text.trim() != "") {
						levels.push(text);
					}
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
