import { TestBed } from '@angular/core/testing';

import { ParametrosFilterService } from './filtro-parametros.service';

describe('ParametrosFilterService', () => {
  let service: ParametrosFilterService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ParametrosFilterService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should remove duplicate ids and avoid duplicate emissions', () => {
    const emissions: number[][] = [];
    service.get().subscribe((ids) => emissions.push(ids));

    service.set([2, 2, 1]);
    service.set([1, 2]);

    expect(service.snapshot().sort()).toEqual([1, 2]);
    expect(emissions.length).toBe(2);
  });
});
