import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClaimProgress } from './claim-progress';

describe('ClaimProgress', () => {
  let component: ClaimProgress;
  let fixture: ComponentFixture<ClaimProgress>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClaimProgress]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClaimProgress);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
