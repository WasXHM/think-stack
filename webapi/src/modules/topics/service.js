export function createTopicService(topicStore) {
  return {
    listCategories() { return topicStore.listCategories(); },
    createCategory(input) { return topicStore.createCategory(input); },
    list(input) {
      return topicStore.listTopics(input);
    },
    create(input) {
      return topicStore.createTopic(input);
    },
    get(topicId) {
      return topicStore.getTopic(topicId);
    },
    update(topicId, changes) {
      return topicStore.updateTopic(topicId, changes);
    },
    remove(topicId) {
      return topicStore.deleteTopic(topicId);
    },
    createExternalAnswer(topicId, input) {
      return topicStore.createExternalAnswer(topicId, input);
    },
    updateExternalAnswer(topicId, answerId, changes) {
      return topicStore.updateExternalAnswer(topicId, answerId, changes);
    },
    removeExternalAnswer(topicId, answerId) {
      return topicStore.deleteExternalAnswer(topicId, answerId);
    },
    createUnderstanding(topicId, input) {
      return topicStore.createUnderstanding(topicId, input);
    },
    updateUnderstanding(topicId, understandingId, changes) {
      return topicStore.updateUnderstanding(topicId, understandingId, changes);
    },
    removeUnderstanding(topicId, understandingId) {
      return topicStore.deleteUnderstanding(topicId, understandingId);
    },
  };
}
