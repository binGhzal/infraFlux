import * as pulumi from '@pulumi/pulumi';
import * as k8s from '@pulumi/kubernetes';
import * as flux from '@worawat/flux';
import * as github from '@pulumi/github';
import * as tls from '@pulumi/tls';
import { gitOpsConfig } from '@/config';
import { logResource } from '@/utils/logger';

export interface GitOpsArgs {
  kubeconfig: pulumi.Output<string>;
  clusterName: string;
}

export class GitOps extends pulumi.ComponentResource {
  public readonly ready: pulumi.Output<boolean>;

  constructor(
    name: string,
    args: GitOpsArgs,
    opts?: pulumi.ComponentResourceOptions
  ) {
    super('infraflux:gitops:GitOps', name, {}, opts);

    if (!gitOpsConfig.enabled || !gitOpsConfig.repoUrl) {
      logResource('GitOps', 'Skipped', {
        reason: 'GitOps not enabled or repo URL not provided',
      });
      this.ready = pulumi.Output.create(false);
      return;
    }

    logResource('GitOps', 'Creating', { name, repo: gitOpsConfig.repoUrl });

    // Create Kubernetes provider
    const k8sProvider = new k8s.Provider(
      `${name}-k8s`,
      {
        kubeconfig: args.kubeconfig,
      },
      { parent: this }
    );

    // Generate SSH key for Flux
    const sshKey = new tls.PrivateKey(
      `${name}-flux-ssh`,
      {
        algorithm: 'ECDSA',
        ecdsaCurve: 'P256',
      },
      { parent: this }
    );

    // If using GitHub, set up deploy key (optional - only if GitHub token is available)
    if (
      process.env.GITHUB_TOKEN &&
      gitOpsConfig.repoUrl.includes('github.com')
    ) {
      const repoPath = gitOpsConfig.repoUrl
        .replace(/.*github\.com[/:]/g, '')
        .replace(/\.git$/, '');
      const [, repo] = repoPath.split('/');

      new github.RepositoryDeployKey(
        `${name}-deploy-key`,
        {
          repository: repo,
          title: `flux-${args.clusterName}`,
          key: sshKey.publicKeyOpenssh,
          readOnly: false,
        },
        { parent: this }
      );
    }

    // Create Flux provider
    const fluxProvider = new flux.Provider(
      `${name}-flux`,
      {
        git: {
          url: gitOpsConfig.repoUrl
            .replace('https://', 'ssh://git@')
            .replace('github.com/', 'github.com:'),
          branch: gitOpsConfig.branch,
          ssh: {
            username: 'git',
            privateKey: sshKey.privateKeyPem,
          },
        },
      },
      { parent: this }
    );

    // Bootstrap Flux
    const fluxBootstrap = new flux.FluxBootstrapGit(
      `${name}-bootstrap`,
      {
        path: gitOpsConfig.path,
        interval: gitOpsConfig.reconcileInterval,
        components: [
          'source-controller',
          'kustomize-controller',
          'helm-controller',
          'notification-controller',
        ],
        version: 'v2.2.2', // Use a stable version
      },
      {
        provider: fluxProvider,
        parent: this,
      }
    );

    // Create a namespace for applications
    new k8s.core.v1.Namespace(
      `${name}-apps`,
      {
        metadata: {
          name: 'apps',
        },
      },
      {
        provider: k8sProvider,
        parent: this,
      }
    );

    // Create a basic Kustomization for the apps directory
    new k8s.apiextensions.CustomResource(
      `${name}-apps-kustomization`,
      {
        apiVersion: 'kustomize.toolkit.fluxcd.io/v1',
        kind: 'Kustomization',
        metadata: {
          name: 'apps',
          namespace: 'flux-system',
        },
        spec: {
          interval: gitOpsConfig.reconcileInterval,
          path: `${gitOpsConfig.path}/apps`,
          prune: true,
          sourceRef: {
            kind: 'GitRepository',
            name: 'flux-system',
          },
        },
      },
      {
        provider: k8sProvider,
        parent: this,
        dependsOn: [fluxBootstrap],
      }
    );

    this.ready = pulumi.Output.create(true);

    this.registerOutputs({
      ready: this.ready,
    });
  }
}
