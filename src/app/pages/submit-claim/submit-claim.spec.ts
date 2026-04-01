import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SubmitClaim } from './submit-claim';

describe('SubmitClaim', () => {
  let component: SubmitClaim;
  let fixture: ComponentFixture<SubmitClaim>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SubmitClaim]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SubmitClaim);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
