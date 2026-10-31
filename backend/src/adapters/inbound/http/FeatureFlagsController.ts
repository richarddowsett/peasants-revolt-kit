import { Request, Response } from 'express';
import { GetFeatureFlagInboundPort } from '../../../domain/ports/inbound/GetFeatureFlagInboundPort';
import { SetFeatureFlagInboundPort } from '../../../domain/ports/inbound/SetFeatureFlagInboundPort';
import { ErrorAlertOutboundPort } from '../../../domain/ports/outbound/ErrorAlertOutboundPort';
import { isErrorAlreadyAlerted } from '../../outbound/observability/ErrorObservabilityAdapter';

export class FeatureFlagsController {
  constructor(
    private getFeatureFlagUseCase: GetFeatureFlagInboundPort,
    private setFeatureFlagUseCase: SetFeatureFlagInboundPort,
    private errorAlertPort?: ErrorAlertOutboundPort
  ) {}

  async getFlags(req: Request, res: Response): Promise<void> {
    try {
      const flags = await this.getFeatureFlagUseCase.getAllFlags();
      res.json(flags);
    } catch (err: unknown) {
      const message = (err as Error).message || 'Failed to retrieve feature flags';
      if (this.errorAlertPort && !isErrorAlreadyAlerted(err)) {
        await this.errorAlertPort.reportError({
          category: 'SYSTEM_ERROR',
          operation: 'GET /api/feature-flags',
          errorMessage: message,
          stack: (err as Error).stack,
          httpStatus: 500,
        });
      }
      res.status(500).json({ error: message });
    }
  }

  async getFlag(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const flag = await this.getFeatureFlagUseCase.getFlag(id);
      if (!flag) {
        res.status(404).json({ error: `Feature flag '${id}' not found` });
        return;
      }
      res.json(flag);
    } catch (err: unknown) {
      const message = (err as Error).message || 'Failed to retrieve feature flag';
      if (this.errorAlertPort && !isErrorAlreadyAlerted(err)) {
        await this.errorAlertPort.reportError({
          category: 'SYSTEM_ERROR',
          operation: 'GET /api/feature-flags/:id',
          errorMessage: message,
          stack: (err as Error).stack,
          httpStatus: 500,
          metadata: { flagId: req.params?.id },
        });
      }
      res.status(500).json({ error: message });
    }
  }

  async setFlag(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { enabled, name, description } = req.body;

      if (typeof enabled !== 'boolean') {
        res.status(400).json({ error: 'Property "enabled" must be a boolean.' });
        return;
      }

      const updated = await this.setFeatureFlagUseCase.execute({
        id,
        enabled,
        name,
        description,
      });

      res.json(updated);
    } catch (err: unknown) {
      const message = (err as Error).message || 'Failed to update feature flag';
      if (this.errorAlertPort && !isErrorAlreadyAlerted(err)) {
        await this.errorAlertPort.reportError({
          category: 'ADMIN_ACTION_FAILURE',
          operation: 'PATCH /api/feature-flags/:id',
          errorMessage: message,
          stack: (err as Error).stack,
          httpStatus: 400,
          metadata: { flagId: req.params?.id, enabled: req.body?.enabled },
        });
      }
      res.status(400).json({ error: message });
    }
  }
}
