export function isTopicOwner(topic, user) {
  return Boolean(
    topic
    && user
    && typeof topic.ownerUsername === 'string'
    && topic.ownerUsername.length > 0
    && typeof user.username === 'string'
    && user.username.length > 0
    && topic.ownerUsername === user.username,
  );
}
