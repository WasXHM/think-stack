import {
  filterCreateExternalAnswer,
  filterCreateTopic,
  filterCreateCategory,
  filterCreateUnderstanding,
  filterExternalAnswerParams,
  filterListTopicsQuery,
  filterTopicParams,
  filterUnderstandingParams,
  filterUpdateExternalAnswer,
  filterUpdateTopic,
  filterUpdateUnderstanding,
} from './filter.js';

export async function listTopics(ctx) {
  const input = filterListTopicsQuery(ctx.query);
  ctx.body = { data: await ctx.topicService.list(input) };
}

export async function createTopic(ctx) {
  const input = filterCreateTopic(ctx.request.body);
  const topic = await ctx.topicService.create(input);
  ctx.status = 201;
  ctx.body = { data: topic };
}

export async function getTopic(ctx) {
  const { topicId } = filterTopicParams(ctx.params);
  ctx.body = { data: await ctx.topicService.get(topicId) };
}

export async function updateTopic(ctx) {
  const { topicId } = filterTopicParams(ctx.params);
  const changes = filterUpdateTopic(ctx.request.body);
  ctx.body = { data: await ctx.topicService.update(topicId, changes) };
}

export async function deleteTopic(ctx) {
  const { topicId } = filterTopicParams(ctx.params);
  await ctx.topicService.remove(topicId);
  ctx.status = 204;
}

export async function createExternalAnswer(ctx) {
  const { topicId } = filterTopicParams(ctx.params);
  const input = filterCreateExternalAnswer(ctx.request.body);
  const answer = await ctx.topicService.createExternalAnswer(topicId, input);
  ctx.status = 201;
  ctx.body = { data: answer };
}

export async function updateExternalAnswer(ctx) {
  const { topicId, answerId } = filterExternalAnswerParams(ctx.params);
  const changes = filterUpdateExternalAnswer(ctx.request.body);
  ctx.body = {
    data: await ctx.topicService.updateExternalAnswer(topicId, answerId, changes),
  };
}

export async function deleteExternalAnswer(ctx) {
  const { topicId, answerId } = filterExternalAnswerParams(ctx.params);
  await ctx.topicService.removeExternalAnswer(topicId, answerId);
  ctx.status = 204;
}

export async function createUnderstanding(ctx) {
  const { topicId } = filterTopicParams(ctx.params);
  const input = filterCreateUnderstanding(ctx.request.body);
  const understanding = await ctx.topicService.createUnderstanding(topicId, input);
  ctx.status = 201;
  ctx.body = { data: understanding };
}

export async function updateUnderstanding(ctx) {
  const { topicId, understandingId } = filterUnderstandingParams(ctx.params);
  const changes = filterUpdateUnderstanding(ctx.request.body);
  ctx.body = {
    data: await ctx.topicService.updateUnderstanding(topicId, understandingId, changes),
  };
}

export async function deleteUnderstanding(ctx) {
  const { topicId, understandingId } = filterUnderstandingParams(ctx.params);
  await ctx.topicService.removeUnderstanding(topicId, understandingId);
  ctx.status = 204;
}

export async function listCategories(ctx) {
  ctx.body = { data: await ctx.topicService.listCategories() };
}
export async function createCategory(ctx) {
  ctx.body = { data: await ctx.topicService.createCategory(filterCreateCategory(ctx.request.body)) };
  ctx.status = 201;
}
