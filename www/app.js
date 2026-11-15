/**
 * @import { ListItem } from "./app.types"
 */

import { Deferred } from "./app/deferred.js";
import { player } from "./app/player.js";

const listInput =
	/** @type {HTMLTextAreaElement} */
	(document.getElementById("list-input"));

const listExportEl =
	/** @type {HTMLAnchorElement} */
	(document.getElementById("list-export"));

const listItemsEl =
	/** @type {HTMLUListElement} */
	(document.getElementById("list-items"));

/** @type {ListItem | null} */
export let currentItem = null;

/** @type {Deferred<IDBDatabase>} */
const db = new Deferred();

/**
 * @type {Deferred<Map<string, ListItem>>}
 */
const listItems = new Deferred();

function updateListExportBtn() {
	listExportEl.replaceChildren(new Text(`Export ${/** @type {Map<string, ListItem>} */(listItems.value).size} video(s)`));
}

listExportEl.addEventListener("click", function (event) {
	if (listItems.value === null) {
		event.preventDefault();
		return;
	}

	const backup = new Blob([
		JSON.stringify({
			version: 1,
			list: [...listItems.value.values()]
		}, null, 4)
	]);

	const url = window.URL.createObjectURL(backup);
	listExportEl.href = url;

    setTimeout(function() {
        window.URL.revokeObjectURL(url);
    }, 1000);
});

/**
 * @param {ListItem} item
 */
function makeListItemNode(item) {
	const listItem = document.createElement("li");
	listItem.classList.add("list-item");

	const listItemLink = document.createElement("a");
	listItemLink.href = `#/v/${item.videoId}/`;
	listItemLink.classList.add("list-item-link");

	const listItemThumb = document.createElement("img");
	listItemThumb.src = `https://img.youtube.com/vi/${item.videoId}/mqdefault.jpg`;
	listItemThumb.classList.add("list-item-thumb");

	const listItemText = document.createElement("div");
	listItemText.classList.add("list-item-text");

	if ("title" in item) {
		const listItemTextTitle = document.createElement("span");
		listItemTextTitle.classList.add("list-item-text-line");
		listItemTextTitle.replaceChildren(new Text(item.title));

		if ("author" in item) {
			const listItemTextAuthor = document.createElement("span");
			listItemTextAuthor.classList.add("list-item-text-line", "text-dark");
			listItemTextAuthor.replaceChildren(new Text(item.author));

			listItemText.replaceChildren(listItemTextTitle, listItemTextAuthor);
		} else {
			listItemText.replaceChildren(listItemTextTitle);
		}
	} else {
		const listItemTextVideoId = document.createElement("i");
		listItemTextVideoId.classList.add("list-item-text-line", "text-dark");
		listItemTextVideoId.replaceChildren(new Text(`https://youtu.be/${item.videoId}`));

		listItemText.replaceChildren(listItemTextVideoId);
	}

	listItemLink.replaceChildren(listItemThumb, listItemText);

	const listItemRemove = document.createElement("button");
	listItemRemove.classList.add("list-item-remove");
	listItemRemove.dataset["videoId"] = item.videoId;
	listItemRemove.replaceChildren(new Text("✕"));

	listItem.replaceChildren(listItemLink, listItemRemove);

	return listItem;
}

db.then(function (db) {
	db
		.transaction("list", "readonly")
		.objectStore("list")
		.getAll()
		.addEventListener("success", function () {
			const listItemNodes = [];
			// TODO: setup linting so that removing the following type declaration results in an error
			/** @type {Map<string, ListItem>} */
			const listItemMap = new Map();

			for (let i = this.result.length - 1; i >= 0; i--) {
				const item = /** @type {ListItem} */(this.result[i]);

				listItemNodes.push(makeListItemNode(item));
				listItemMap.set(item.videoId, item);
			}

			listItemsEl.replaceChildren(...listItemNodes);
			listItems.resolve(listItemMap);

			updateListExportBtn();

			listInput.addEventListener("input", checkListInput);

			checkListInput();
		});
});

export function updateVideoData() {
	/** @type {ListItem} */(currentItem).updatedAt = new Date();

	/** @type {IDBDatabase} */(db.value)
		.transaction("list", "readwrite")
		.objectStore("list")
		.put(currentItem);
}

// TODO: handle `blocked` and `error`
const openReq = indexedDB.open("index", 1);

openReq.addEventListener("upgradeneeded", function () {
	this.result.createObjectStore("list", { keyPath: "itemId", autoIncrement: true });
});

openReq.addEventListener("success", function () {
	db.resolve(this.result);
});

/**
 * @param {string} url
 */
function tryParseUrl(url) {
	try {
		return new URL(url);
	} catch (e) {
		if (e instanceof TypeError) {
			return null;
		}

		throw e;
	}
}

/** @type {(item: ListItem) => void} */
const cuePlayerVideo = player.bind(function (player, item) {
	player.cueVideoById(item.videoId, item.timestamp);
});

/** @type {(videoId: string) => void} */
const urlVideoIdUpdated = listItems.bind(function (listItems, videoId) {
	const listItem = listItems.get(videoId);

	if (listItem !== undefined) {
		currentItem = listItem;
		cuePlayerVideo(listItem);
	} else {
		window.location.replace("#/");
	}
});

/**
 * @param hash {string}
 */
function tryParseHash(hash) {
	if (!hash.startsWith("#")) {
		return "#/";
	}

	if (!hash.endsWith("/")) {
		return hash + "/";
	}

	if (hash === "#/") {
		currentItem = null;
		return null;
	} else if (hash.startsWith("#/v/")) {
		const videoId = hash.slice(4, -1);
		urlVideoIdUpdated(videoId);
		return null;
	}

	return "#/";
}

function updatePath() {
	const redirect = tryParseHash(window.location.hash);

	if (redirect !== null) {
		window.location.replace(redirect);
	}
}

updatePath();

window.addEventListener("hashchange", function () {
	updatePath();
});

/**
 * @param {string | null} string
 * @param {number} fallback
 */
function parseIntOrDefault(string, fallback) {
	if (string === null) {
		return fallback;
	}

	const parsed = parseInt(string);

	if (Number.isNaN(parsed)) {
		return fallback;
	}

	return parsed;
}

/**
 * @param {IDBObjectStore} store
 * @param {number} i
 * @param {string[]} input
 */
function processNextUrl(store, i, input) {
	const listItemsMap = /** @type {Map<string, ListItem>} */(listItems.value);

	for (; i < input.length; i++) {
		const line = input[i].trim();

		if (line === "") {
			continue;
		}

		const url = tryParseUrl(line);

		if (url === null) {
			continue;
		}

		let videoId = null;

		switch (url.hostname) {
			case "www.youtube.com":
			case "youtube.com":
				if (url.pathname.startsWith("/shorts/")) {
					videoId = url.pathname.slice(8);
				} else {
					videoId = url.searchParams.get("v");
				}
				break;
			case "youtu.be":
				videoId = url.pathname.slice(1);
				break;
		}

		if (videoId === null) {
			continue;
		}

		let timestamp = parseIntOrDefault(url.searchParams.get("t"), 0);

		if (listItemsMap.has(videoId)) {
			listInput.value = "";
			continue;
		}

		const listItem = { videoId, createdAt: new Date(), timestamp };

		store
			.add(listItem)
			.addEventListener("success", function () {
				const keyedListItem = /** @type {ListItem} */(listItem);
				keyedListItem.itemId = /** @type {number} */(this.result);

				listItemsMap.set(videoId, keyedListItem);
				listItemsEl.insertBefore(
					makeListItemNode(keyedListItem),
					listItemsEl.firstChild
				);

				processNextUrl(store, i + 1, input)
			});

		return;
	}

	updateListExportBtn();
	listInput.disabled = false;
}

function checkListInput() {
	const input = listInput.value;
	listInput.value = "";
	listInput.disabled = true;

	const inputLines = input.split(/\n/);

	const store = /** @type {IDBDatabase} */(db.value)
		.transaction("list", "readwrite")
		.objectStore("list");

	processNextUrl(store, 0, inputLines);
}

listItemsEl.addEventListener("click", function (event) {
	const targetEl = /** @type {HTMLElement} */(event.target);

	if (targetEl.classList.contains("list-item-remove")) {
		const removeButton = /** @type {HTMLButtonElement} */(targetEl);
		const listItemEl = /** @type {HTMLLIElement} */(targetEl.parentNode);
		const videoId = /** @type {string} */(targetEl.dataset["videoId"]);

		const listItemsMap = /** @type {Map<string, ListItem>} */(listItems.value);
		const itemId = /** @type {ListItem} */(listItemsMap.get(videoId)).itemId;

		removeButton.disabled = true;

		/** @type {IDBDatabase} */(db.value)
			.transaction("list", "readwrite")
			.objectStore("list")
			.delete(itemId)
			.addEventListener("success", function () {
				listItemsMap.delete(videoId);

				if (currentItem !== null && videoId === currentItem.videoId) {
					window.location.replace("#/");
				}

				listItemsEl.removeChild(listItemEl);

				updateListExportBtn();

				removeButton.disabled = false;
			});
	}
});
