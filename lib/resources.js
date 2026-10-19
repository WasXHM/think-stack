export const resourcesDir = process.env.RESOURCES_DIR
  ? (process.env.RESOURCES_DIR.startsWith('/') ? process.env.RESOURCES_DIR : `${process.cwd()}/webapi/${process.env.RESOURCES_DIR}`)
  : `${process.cwd()}/webapi/resources`;

