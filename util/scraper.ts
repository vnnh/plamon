//maybe this could be cleaned up soon tm

import { Element } from "domhandler";
import { find, findOne, getChildren, textContent } from "domutils";

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
				return element.attribs["href"] === "locations.shtml";
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
						return element.attribs["href"] !== undefined && !!element.attribs["href"].match("hisui");
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
							href: element.attribs.href,
							regions: [],
						};
					} else if (element.name === "a") {
						scrapedLocations[currentMajor].regions.push({
							name: textContent(element),
							href: element.attribs.href,
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

	const scrapedEvolutions: Evolution[] = [];
	let evoIndex = -1;

	findOne(
		(element) => {
			const test = element.name === "td" && element.attribs["class"] === "fooinfo";

			if (test === true) {
				const list = element.children
					.find((element) => element.name === "table")!
					.children.find((element) => element.name === "tr")!.children;

				for (const element of list) {
					if (element.name === "td" && element.attribs["class"] === "pkmn") {
						evoIndex += 1;

						scrapedEvolutions[evoIndex] = {
							name: element.firstChild!.firstChild!.attribs.alt,
							href: element.firstChild!.attribs.href,
							requirement: "",
						};
					} else if (element.name === "td") {
						const container = element.firstChild;
						if (container!.children!.length === 0) {
							scrapedEvolutions[evoIndex].requirement = element.firstChild!.attribs.title ?? "";
						} else {
							scrapedEvolutions[evoIndex].requirement =
								element.firstChild!.firstChild!.attribs.title ?? "";
						}
					}
				}
			}

			return test;
		},
		getChildren(evolutionSectionNode!),
		true,
	);

	return scrapedEvolutions;
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

	return textContent(
		findOne(
			(element) => {
				return element.name === "td" && !!textContent(element).match("Hisui");
			},
			getChildren(dexInfoNode!),
			true,
		)!.firstChild!.lastChild!,
	);
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
						return element.name === "td" && !!textContent(element).match("Standard Level Up");
					},
					element.children,
					true,
				) && element.parent!.attribs.id === "legends"
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
						!!element.children.find((value) => {
							return value.name === "br";
						})
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
