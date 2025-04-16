const { Events } = require('discord.js');
const { GP_THREAD_CHANNEL } = require('../consts.json');
const { sendActiveThreadsMessage } = require('../utils/threadUtils');

module.exports = {
	name: Events.ClientReady,
	once: true,
	async execute(client) {
		console.log(`Ready! Logged in as ${client.user.tag}`);

		client.activeThreads = new Map(); // Initialize thread tracking

		const channel = await client.channels.fetch(GP_THREAD_CHANNEL.id).catch(console.error);
		if (!channel || !channel.threads) {
			console.error(`Failed to fetch threads from channel ID: ${GP_THREAD_CHANNEL.id}`);
			return;
		}

		// Fetch active threads from the forum channel
		const fetchedThreads = await channel.threads.fetchActive().catch(console.error);
		if (fetchedThreads) {
			// Use a for-of loop to handle async operations inside
			for (const thread of fetchedThreads.threads.values()) {
				// Initialize thread data
				const threadData = {
					id: thread.id,
					createdTimestamp: thread.createdTimestamp,
					tagIds: thread.appliedTags || [],
					title: thread.name,
					reactions: new Map(), // Initialize reactions map
					starterMessageBody: null, // Placeholder for starter message body
				};

				// Fetch the original (starter) message of the thread
				try {
					const starterMessage = await thread.fetchStarterMessage();
					if (starterMessage) {
						threadData.starterMessageBody = starterMessage.content || '[No Content]'; // Store message content

						// Loop through the reactions on the starter message
						starterMessage.reactions.cache.forEach((reaction) => {
							const emojiName = reaction.emoji.name;
							const count = reaction.count;
							threadData.reactions.set(emojiName, count);
						});
					}
				} catch (error) {
					console.error(`Error fetching starter message for thread ${thread.id}:`, error);
				}

				// Store the thread data in activeThreads
				client.activeThreads.set(thread.id, threadData);
			}
		}

		console.log(`Loaded ${client.activeThreads.size} active threads.`);

		// Send active threads message with updated data
		await sendActiveThreadsMessage(client.activeThreads, client);
	},
};
