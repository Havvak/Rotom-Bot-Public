const { GP_THREAD_CHANNEL } = require('../consts.json');
const { sendActiveThreadsMessage } = require('../utils/threadUtils');

module.exports = {
	name: 'messageReactionRemove',
	async execute(reaction, user, details, client) {
		// Ensure the reaction structure is fully loaded
		if (reaction.partial) {
			try {
				await reaction.fetch();
			} catch (error) {
				console.error('Error fetching reaction:', error);
				return;
			}
		}

		// Get the thread and parent forum channel
		const thread = reaction.message.channel;
		const parentChannel = thread?.parent;

		// Ensure it's in the correct parent channel and has the "testing" tag
		if (
			parentChannel &&
			parentChannel.id === GP_THREAD_CHANNEL.id &&
			thread.appliedTags.includes(GP_THREAD_CHANNEL.tagIds.testing)
		) {
			// Ensure the thread exists in activeThreads before modifying
			if (client.activeThreads.has(thread.id)) {
				const threadData = client.activeThreads.get(thread.id);

				// Ensure reactions map is initialized
				if (!threadData.reactions) {
					threadData.reactions = new Map();
				}

				// Update only the reactions, leaving other properties unchanged
				reaction.message.reactions.cache.forEach((r) => {
					threadData.reactions.set(r.emoji.name, r.count);
				});

				console.log(`Updated reactions for thread ${thread.name} (${thread.id}):`);
				threadData.reactions.forEach((count, emoji) => {
					console.log(`- ${emoji}: ${count}`);
				});

				// Send updated active threads message
				sendActiveThreadsMessage(client.activeThreads, client);
			}
		}
	},
};
