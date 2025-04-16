/* eslint-disable brace-style */
const { GP_THREAD_CHANNEL } = require('../consts.json');
const { sendActiveThreadsMessage } = require('../utils/threadUtils');

module.exports = {
	name: 'threadUpdate',
	async execute(oldThread, newThread) {
		console.log(`Thread updated: ${newThread.name} (${newThread.id})`);

		// Ensure the thread belongs to the monitored channel
		if (newThread.parentId !== GP_THREAD_CHANNEL.id) {
			console.log(`Thread ${newThread.id} is not in the monitored channel, ignoring.`);
			return;
		}

		const client = newThread.client;

		// If the thread became inactive (archived, locked, or closed)
		if (!oldThread.archived && newThread.archived) {
			if (client.activeThreads.has(newThread.id)) {
				client.activeThreads.delete(newThread.id);
				console.log(`Thread ${newThread.name} removed from active threads.`);
			}
			sendActiveThreadsMessage(client.activeThreads, client);
		}
		// If the thread became active (reactivated)
		else if (oldThread.archived && !newThread.archived) {
			let starterMessageBody = '';
			try {
				const starterMessage = await newThread.fetchStarterMessage();
				starterMessageBody = starterMessage ? starterMessage.content || '[No Content]' : '[No Content]';
			} catch (error) {
				console.error(`Error fetching starter message for thread ${newThread.name}:`, error);
				starterMessageBody = '[Error fetching message]';
			}

			client.activeThreads.set(newThread.id, {
				id: newThread.id,
				createdTimestamp: newThread.createdTimestamp,
				tagIds: newThread.appliedTags || [],
				title: newThread.name,
				starterMessageBody,
				reactions: new Map(), // reactions are blank at creation
			});
			console.log(`Thread ${newThread.id} added to active threads.`);
			sendActiveThreadsMessage(client.activeThreads, client);
		}
		// If only appliedTags have changed, update just that part
		else if (JSON.stringify(oldThread.appliedTags) !== JSON.stringify(newThread.appliedTags)) {
			if (client.activeThreads.has(newThread.id)) {
				const threadData = client.activeThreads.get(newThread.id);
				threadData.tagIds = newThread.appliedTags || [];
				// Leave starterMessageBody and reactions unchanged.
				client.activeThreads.set(newThread.id, threadData);
				console.log(`Thread ${newThread.name} had its appliedTags updated.`);
			}
			sendActiveThreadsMessage(client.activeThreads, client);
		}
	},
};
