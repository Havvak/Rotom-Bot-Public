const {
	GP_THREAD_CHANNEL,
} = require('../consts.json');
const {
	sendActiveThreadsMessage,
} = require('../utils/threadUtils');

module.exports = {
	name: 'threadDelete',
	execute(thread) {
		console.log(`Thread deleted: ${thread.name} (${thread.id})`);

		// Ensure the thread belongs to the correct channel before updating the list
		if (thread.parentId !== GP_THREAD_CHANNEL.id) {
			console.log(`Thread ${thread.id} is not in the monitored channel, ignoring.`);
			return;
		}

		// Remove the thread from the activeThreads map
		const client = thread.client;
		if (client.activeThreads.has(thread.id)) {
			client.activeThreads.delete(thread.id);
			console.log(`Removed thread ${thread.id} from active threads.`);
		}

		// Send updated active threads message
		sendActiveThreadsMessage(client.activeThreads, client);
	},
};
