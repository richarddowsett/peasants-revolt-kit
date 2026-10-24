import { Request, Response } from 'express';
import { GetFeatureFlagInboundPort } from '../../../domain/ports/inbound/GetFeatureFlagInboundPort';
import { SetFeatureFlagInboundPort } from '../../../domain/ports/inbound/SetFeatureFlagInboundPort';

export class FeatureFlagsController {
  constructor(
    private getFeatureFlagUseCase: GetFeatureFlagInboundPort,
    private setFeatureFlagUseCase: SetFeatureFlagInboundPort
  ) {}

  async getFlags(req: Request, res: Response): Promise<void> {
    try {
      const flags = await this.getFeatureFlagUseCase.getAllFlags();
      res.json(flags);
    } catch (err: unknown) {
      res.status(500).json({ error: (err as Error).message || 'Failed to retrieve feature flags' });
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
      res.status(500).json({ error: (err as Error).message || 'Failed to retrieve feature flag' });
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
      res.status(400).json({ error: (err as Error).message || 'Failed to update feature flag' });
    }
  }
}
