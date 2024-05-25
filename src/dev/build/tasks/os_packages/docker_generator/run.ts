/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { access, link, unlink, chmod } from 'fs';
import { resolve, basename } from 'path';
import { promisify } from 'util';

import { ToolingLog } from '@kbn/tooling-log';
import { kibanaPackageJson } from '@kbn/repo-info';

import { write, copyAll, mkdirp, exec, Config, Build } from '../../../lib';
import * as dockerTemplates from './templates';
import { TemplateContext } from './template_context';
import { bundleDockerFiles } from './bundle_dockerfiles';

const accessAsync = promisify(access);
const linkAsync = promisify(link);
const unlinkAsync = promisify(unlink);
const chmodAsync = promisify(chmod);

export async function runDockerGenerator(
  config: Config,
  log: ToolingLog,
  build: Build,
  flags: {
    architecture?: string;
    baseImage: 'none' | 'chainguard' | 'ubi' | 'ubuntu';
    context: boolean;
    image: boolean;
    ironbank?: boolean;
    cloud?: boolean;
    serverless?: boolean;
    dockerBuildDate?: string;
    fips?: boolean;
  }
) {
  let baseImageName = '';
  if (flags.baseImage === 'ubuntu') baseImageName = 'ubuntu:20.04';
  if (flags.baseImage === 'ubi') baseImageName = 'docker.elastic.co/ubi9/ubi-minimal:latest';
  if (flags.baseImage === 'chainguard')
    baseImageName = 'docker.elastic.co/wolfi/chainguard-base:20230214';

  let imageFlavor = '';
  if (flags.baseImage === 'ubi') imageFlavor += `-ubi`;
  if (flags.baseImage === 'chainguard') imageFlavor += `-chainguard`;
  if (flags.ironbank) imageFlavor += '-ironbank';
  if (flags.cloud) imageFlavor += '-cloud';
  if (flags.serverless) imageFlavor += '-serverless';
  if (flags.fips) imageFlavor += '-fips';

  // General docker var config
  const license = 'Elastic License';
  const configuredNamespace = config.getDockerNamespace();
  const imageNamespace = configuredNamespace
    ? configuredNamespace
    : flags.cloud || flags.serverless
    ? 'kibana-ci'
    : 'kibana';
  const imageTag = `docker.elastic.co/${imageNamespace}/kibana`;
  const version = config.getBuildVersion();
  const artifactArchitecture = flags.architecture === 'aarch64' ? 'aarch64' : 'x86_64';
  const artifactPrefix = `kibana-${version}-linux`;
  const artifactTarball = `${artifactPrefix}-${artifactArchitecture}.tar.gz`;
  const beatsArchitecture = flags.architecture === 'aarch64' ? 'arm64' : 'x86_64';
  const metricbeatTarball = `metricbeat-${version}-linux-${beatsArchitecture}.tar.gz`;
  const filebeatTarball = `filebeat-${version}-linux-${beatsArchitecture}.tar.gz`;
  const artifactsDir = config.resolveFromTarget('.');
  const beatsDir = config.resolveFromRepo('.beats');
  const dockerBuildDate = flags.dockerBuildDate || new Date().toISOString();
  const dockerBuildDir = config.resolveFromRepo('build', 'kibana-docker', `default${imageFlavor}`);
  const imageArchitecture = flags.architecture === 'aarch64' ? '-aarch64' : '';
  const dockerTargetFilename = config.resolveFromTarget(
    `kibana${imageFlavor}-${version}-docker-image${imageArchitecture}.tar.gz`
  );
  const dependencies = [
    resolve(artifactsDir, artifactTarball),
    ...(flags.cloud
      ? [resolve(beatsDir, metricbeatTarball), resolve(beatsDir, filebeatTarball)]
      : []),
  ];

  const dockerPush = config.getDockerPush();
  const dockerTag = config.getDockerTag();
  const dockerTagQualifier = config.getDockerTagQualfiier();
  const dockerCrossCompile = config.getDockerCrossCompile();
  const publicArtifactSubdomain = config.isRelease ? 'artifacts' : 'snapshots-no-kpi';

  const scope: TemplateContext = {
    artifactPrefix,
    artifactTarball,
    imageFlavor,
    version,
    branch: kibanaPackageJson.branch,
    license,
    artifactsDir,
    imageTag,
    dockerBuildDir,
    dockerTargetFilename,
    dockerPush,
    dockerTag,
    dockerTagQualifier,
    dockerCrossCompile,
    baseImageName,
    dockerBuildDate,
    baseImage: flags.baseImage,
    cloud: flags.cloud,
    serverless: flags.serverless,
    metricbeatTarball,
    filebeatTarball,
    ironbank: flags.ironbank,
    architecture: flags.architecture,
    revision: config.getBuildSha(),
    publicArtifactSubdomain,
    fips: flags.fips,
  };

  type HostArchitectureToDocker = Record<string, string>;
  const hostTarget: HostArchitectureToDocker = {
    x64: 'x64',
    arm64: 'aarch64',
  };
  const buildArchitectureSupported = hostTarget[process.arch] === flags.architecture;
  if (flags.architecture && !buildArchitectureSupported && !dockerCrossCompile) {
    return;
  }

  // Create the docker build target folder
  await mkdirp(dockerBuildDir);

  // Write all the needed docker config files
  // into kibana-docker folder
  for (const [, dockerTemplate] of Object.entries(dockerTemplates)) {
    await write(resolve(dockerBuildDir, dockerTemplate.name), dockerTemplate.generator(scope));
  }

  // Copy serverless-only configuration files
  if (flags.serverless) {
    await mkdirp(resolve(dockerBuildDir, 'config'));
    await copyAll(config.resolveFromRepo('config'), resolve(dockerBuildDir, 'config'), {
      select: ['serverless*.yml'],
    });
  }

  // Copy all the needed resources into kibana-docker folder
  // in order to build the docker image accordingly the dockerfile defined
  // under templates/kibana_yml.template/js
  await copyAll(
    config.resolveFromRepo('src/dev/build/tasks/os_packages/docker_generator/resources/base'),
    dockerBuildDir
  );

  // Copy fips related resources
  if (flags.fips) {
    await copyAll(
      config.resolveFromRepo('src/dev/build/tasks/os_packages/docker_generator/resources/fips'),
      dockerBuildDir
    );
  }

  // Build docker image into the target folder
  // In order to do this we just call the file we
  // created from the templates/build_docker_sh.template.js
  // and we just run that bash script
  await chmodAsync(`${resolve(dockerBuildDir, 'build_docker.sh')}`, '755');

  // Only build images on native targets
  if (flags.image) {
    // Link dependencies
    for (const src of dependencies) {
      const file = basename(src);
      const dest = resolve(dockerBuildDir, file);
      try {
        await accessAsync(src);
        await unlinkAsync(dest);
      } catch (e) {
        if (e && e.code === 'ENOENT' && e.syscall === 'access') {
          throw new Error(`${src} is needed in order to build the docker image.`);
        }
      }
      await linkAsync(src, dest);
    }

    await exec(log, `./build_docker.sh`, [], {
      cwd: dockerBuildDir,
      level: 'info',
    });
  }

  // Pack Dockerfiles and create a target for them
  if (flags.context) {
    await bundleDockerFiles(config, log, scope);
  }
}
