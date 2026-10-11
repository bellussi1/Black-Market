FROM node:24.21.0-bookworm-slim

ENV COREPACK_HOME=/opt/corepack \
    PNPM_HOME=/opt/pnpm \
    PATH=/opt/pnpm:$PATH

RUN corepack enable && corepack prepare pnpm@10.28.1 --activate
WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/calculators/package.json packages/calculators/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/domain/package.json packages/domain/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile

COPY . .
ARG WEB_BUILD_CONFIGURATION=production
RUN pnpm --filter @bdo/api build && pnpm --filter @bdo/web build --configuration=$WEB_BUILD_CONFIGURATION

ENV NODE_ENV=production
EXPOSE 3000
CMD ["pnpm", "--filter", "@bdo/api", "start:prod"]
