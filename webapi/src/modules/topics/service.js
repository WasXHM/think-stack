export function createTopicService(topicStore) {
  return {
    reorderCategories(ids) { return topicStore.reorderCategories(ids); },
    renameCategory(id, input) { return topicStore.renameCategory(id, input); },
    deleteCategory(id) { return topicStore.deleteCategory(id); },
    listCategories() { return topicStore.listCategories(); },
    createCategory(input) { return topicStore.createCategory(input); },
    list(input, viewerUsername) {
      return topicStore.listTopics({ ...input, viewerUsername });
    },
    create(input, ownerUsername) {
      return topicStore.createTopic(input, ownerUsername);
    },
    get(topicId, viewerUsername) {
      return topicStore.getTopic(topicId, { viewerUsername });
    },
    update(topicId, changes, actorUsername) {
      return topicStore.updateTopic(topicId, changes, actorUsername);
    },
    remove(topicId, actorUsername) {
      return topicStore.deleteTopic(topicId, actorUsername);
    },
    createExternalAnswer(topicId, input, actorUsername) {
      return topicStore.createExternalAnswer(topicId, input, actorUsername);
    },
    updateExternalAnswer(topicId, answerId, changes, actorUsername) {
      return topicStore.updateExternalAnswer(topicId, answerId, changes, actorUsername);
    },
    removeExternalAnswer(topicId, answerId, actorUsername) {
      return topicStore.deleteExternalAnswer(topicId, answerId, actorUsername);
    },
    createUnderstanding(topicId, input, actorUsername) {
      return topicStore.createUnderstanding(topicId, input, actorUsername);
    },
    updateUnderstanding(topicId, understandingId, changes, actorUsername) {
      return topicStore.updateUnderstanding(topicId, understandingId, changes, actorUsername);
    },
    removeUnderstanding(topicId, understandingId, actorUsername) {
      return topicStore.deleteUnderstanding(topicId, understandingId, actorUsername);
    },
    saveDraft(topicId, input, actorUsername) {
      return topicStore.saveDraft(topicId, input, actorUsername);
    },
    removeDraft(topicId, actorUsername) {
      return topicStore.deleteDraft(topicId, actorUsername);
    },
  };
}
