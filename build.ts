import Client, { connect, Container, Directory } from "@dagger.io/dagger";

function bash(command: string) {
  return ["bash", "-c", command];
}

function base(client: Client, repo: Directory): Container {
  return (
    client
      .pipeline("frontend-base-image")
      .container()
      .from("node:16.19-alpine")
      .withExec(["apk", "add", "--no-cache", "bash"])
      .withExec(
        bash(
          "apk add --no-cache build-base git cairo-dev pango-dev jpeg-dev giflib-dev librsvg-dev"
        )
      )
      .withWorkdir("/src")
      .withExec(bash("yarn install --frozen-lockfile"))
      .withDirectory("/src", repo)
      .withExec(bash("yarn install --frozen-lockfile"))
  );
}

async function build(client: Client, repo: Directory) {
  const baseContainer = await base(client, repo)
    .pipeline("frontend-build")
    .withExec(
      bash(
        'NODE_OPTIONS="--max_old_space_size=16384" yarn exec -- vite build'
      )
    )
    .sync();

  return baseContainer;
}

async function main() {
  await connect(async (client) => {
    const repo = client.host().directory(".", {
      exclude: [".git", "node_modules", "dist", "build"],
    });
    await build(client, repo);
  });
}

await main();
