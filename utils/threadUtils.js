const {
	GP_THREAD_CHANNEL,
	GP_LOGS_CHANNEL,
} = require('../consts.json');
const {
	updateGist,
	generateTextFileLines,
} = require('./updateRemoteTxtFile');

async function fetchAndDeleteAllMessagesInChannel(channel) {
	try {
		// Fetch and delete all messages in the channel
		let messages;
		do {
			messages = await channel.messages.fetch({ limit: 100 });
			if (messages.size > 0) {
				try {
					await channel.bulkDelete(messages, true);
				} catch (error) {
					// Ignore the 'Unknown Message' error and log it for debugging
					if (error.code !== 10008) {
						console.error('Error deleting messages:', error);
					}
				}
			}
		} while (messages.size > 0);
	} catch (error) {
		console.error('Error clearing messages:', error);
	}
}


async function sendMessageInClosedThread(thread, messageContent) {
	try {
		// Ensure the thread is archived but NOT locked
		if (!thread.archived || thread.locked) return;

		// Fetch recent messages in the thread (adjust limit if needed)
		const messages = await thread.messages.fetch({ limit: 10 });

		// Check if the message has already been sent
		const alreadySent = messages.some(msg => msg.content === messageContent && msg.author.bot);
		if (alreadySent) {
			console.log(`✅ Message already exists in thread: ${thread.name}, skipping...`);
			return;
		}

		// Temporarily unarchive the thread
		await thread.setArchived(false);
		console.log(`🔓 Temporarily unarchived thread: ${thread.name}`);

		// Send the message
		await thread.send(messageContent);
		console.log(`📢 Message sent in closed thread: ${thread.name}`);

		// Re-archive the thread
		await thread.setArchived(true);
		// console.log(`📁 Thread re-archived: ${thread.name}`);
	} catch (error) {
		console.error(`❌ Failed to send message in closed thread: ${thread.name}`, error);
	}
}

async function sendActiveThreadsMessage(activeThreads, client) {
	const messageChannel = await client.channels.fetch(GP_LOGS_CHANNEL.id).catch(console.error);
	if (!messageChannel) {
		console.error(`Failed to fetch message channel ID: ${GP_LOGS_CHANNEL.id}`);
		return;
	}

	await fetchAndDeleteAllMessagesInChannel(messageChannel);

	const filteredThreads = Array.from(activeThreads.values())
		.filter(thread => !thread.title.includes(GP_LOGS_CHANNEL.excludeThread))
		.sort((a, b) => {
			const usernameA = a.title.split(' ').pop().toLowerCase();
			const usernameB = b.title.split(' ').pop().toLowerCase();
			return usernameA.localeCompare(usernameB);
		});

	const textFileLines = generateTextFileLines(filteredThreads);
	await updateGist(textFileLines);

	const liveThreads = filteredThreads
		.filter(thread => thread.tagIds.includes(GP_THREAD_CHANNEL.tagIds.live))
		.map(thread => `<#${thread.id}> | *Expires* <t:${getExpiryTimestamp(thread.createdTimestamp)}:R>`) // Now `id` is properly stored and accessible
		.join('\n');

	const testingThreads = filteredThreads
		.filter(thread => thread.tagIds.includes(GP_THREAD_CHANNEL.tagIds.testing))
		.map(thread => {
			const { dudChance, misses } = calculateDudChance(thread);
			if (dudChance > 0) {
				return `<#${thread.id}> | **${dudChance}%** *dud*`;
			} else if (misses > 0) {
				return `<#${thread.id}> | **${misses}** *misses*`;
			} else if (dudChance === 0 && misses === 0) {
				return `<#${thread.id}> | *no tests*`;
			} else {
				return `<#${thread.id}> | *no tests*`;
			}
		})
		.join('\n');

	if (liveThreads.length > 0) {
		await messageChannel.send(`## ${GP_LOGS_CHANNEL.liveHeader}\n${liveThreads}`);
	}

	if (testingThreads.length > 0) {
		await messageChannel.send(`## ${GP_LOGS_CHANNEL.testingHeader}\n${testingThreads}`);
	}
}

/**
 * Calculates an expiration timestamp that is 4 days after the original timestamp,
 * counting days only when passing 6 AM GMT.
 *
 * @param {number} originalTimestamp - The original timestamp in seconds.
 * @param {number} daysToAdd - Number of days to add.
 * @returns {number} - The calculated expiration timestamp in seconds.
 */
function getExpiryTimestamp(originalTimestamp, daysToAdd = 3) {
	const date = new Date(originalTimestamp);

	// Set time to the next 6 AM GMT
	const nextSixAM = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 6, 0, 0));
	if (date.getUTCHours() >= 6) {
		nextSixAM.setUTCDate(nextSixAM.getUTCDate() + 1); // Move to the next day's 6 AM
	}

	// Add 4 days, each counting when passing 6 AM GMT
	nextSixAM.setUTCDate(nextSixAM.getUTCDate() + daysToAdd);

	return Math.floor(nextSixAM.getTime() / 1000); // Convert to epoch seconds
}

function calculateDudChance(thread) {
	// Extract the pack size from the thread title using regex
	const match = thread.title.match(/\[(\d+)P\]/);
	if (!match) return { dudChance: 0, misses: 0 }; // Default to 0% and 0 misses if no pack size is found

	const packSize = parseInt(match[1], 10);

	// Reaction probabilities per pack size
	const reactionOdds = {
		'1pack': 1 / packSize,
		'2pack': packSize > 2 ? 1 / (packSize - 1) : 0,
		'3pack': packSize > 3 ? 1 / (packSize - 2) : 0,
		'4pack': packSize > 4 ? 1 / (packSize - 3) : 0,
	};

	let dudProbability = 1;
	let reactionsFound = false;

	// Loop through the reactionOdds and calculate the dud chance
	for (const [reaction, odds] of Object.entries(reactionOdds)) {
		if (odds > 0) { // Only process reactions that exist in reactionOdds
			const count = thread.reactions?.get(reaction) || 0;
			if (count > 0) {
				dudProbability *= Math.pow(1 - odds, count);
				reactionsFound = true;
			}
		}
	}

	// If no other reactions were found, count the "nopack" reactions as misses
	let misses = 0;
	if (!reactionsFound) {
		misses = thread.reactions?.get('nopack') || 0;
	}

	// Calculate the dud chance as a percentage
	const dudChance = ((1 - dudProbability) * 100).toFixed(2);

	return { dudChance, misses };
}

module.exports = {
	sendMessageInClosedThread,
	sendActiveThreadsMessage,
};
