import { render, screen } from '@testing-library/react';
import SkillGraphView from './SkillGraphView';
import type { SkillGraphData } from '@app/typings/content';

describe('SkillGraphView', () => {
  it('renders nodes with state badges', () => {
    const data: SkillGraphData = {
      nodes: [
        { id: 'owned', name: 'Owned', tier: 'Common', state: 'owned', tags: ['Life'], links: [] },
        { id: 'avail', name: 'Available', tier: 'Rare', state: 'available', tags: ['Strike'], links: ['owned'] }
      ],
      edges: [{ from: 'owned', to: 'avail' }]
    };
    render(<SkillGraphView data={data} />);
    expect(screen.getByText('Owned')).toBeInTheDocument();
    expect(screen.getByText('Available')).toBeInTheDocument();
  });
});
