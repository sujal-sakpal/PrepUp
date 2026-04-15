export const DOMAIN_ROLE_MAP: Record<string, string[]> = {
	Technology: [
		'Backend Engineer',
		'Frontend Engineer',
		'Full Stack Engineer',
		'Data Engineer',
		'DevOps Engineer',
		'QA Engineer',
	],
	Finance: ['Financial Analyst', 'Investment Analyst', 'Risk Analyst', 'Accountant'],
	Marketing: ['Growth Marketer', 'Product Marketer', 'SEO Specialist', 'Brand Manager'],
	'Product Management': ['Product Manager', 'Associate Product Manager', 'Technical PM'],
	'Data Science': ['Data Scientist', 'ML Engineer', 'Business Analyst'],
	Design: ['Product Designer', 'UX Designer', 'UI Designer'],
	HR: ['HR Generalist', 'Talent Acquisition Specialist', 'HR Business Partner'],
	Consulting: ['Strategy Consultant', 'Business Consultant', 'Operations Consultant'],
	Sales: ['Account Executive', 'Sales Development Representative', 'Sales Manager'],
	Operations: ['Operations Analyst', 'Program Manager', 'Business Operations Manager'],
}

export const INTERVIEW_DOMAINS = Object.keys(DOMAIN_ROLE_MAP)

export const ROLE_FOCUS_AREAS_MAP: Record<string, string[]> = {
	'Backend Engineer': ['Algorithms', 'System Design', 'APIs', 'Databases', 'Scaling'],
	'Frontend Engineer': ['React/Vue/Angular', 'State Management', 'Performance', 'CSS/Layout', 'Testing'],
	'Full Stack Engineer': ['Architecture', 'Databases', 'APIs', 'Frontend Frameworks', 'DevOps'],
	'Data Engineer': ['Data Pipelines', 'SQL', 'Data Modeling', 'ETL', 'Performance'],
	'DevOps Engineer': ['CI/CD', 'Kubernetes', 'Infrastructure', 'Monitoring', 'Automation'],
	'QA Engineer': ['Test Strategy', 'Automation', 'Bug Detection', 'Test Planning', 'Performance'],
	'Financial Analyst': ['Valuation', 'Financial Modeling', 'Risk Analysis', 'Market Research'],
	'Investment Analyst': ['Portfolio Analysis', 'Due Diligence', 'Valuation', 'Market Trends'],
	'Risk Analyst': ['Risk Frameworks', 'Quantitative Analysis', 'Regulatory Compliance', 'Scenario Planning'],
	Accountant: ['Financial Reporting', 'Reconciliation', 'Compliance', 'Controls', 'Tax Basics'],
	'Growth Marketer': ['Experimentation', 'Metrics', 'Customer Acquisition', 'Retention'],
	'Product Marketer': ['Positioning', 'Messaging', 'Go-to-Market', 'Competitive Analysis', 'Launch Strategy'],
	'SEO Specialist': ['Keyword Strategy', 'Technical SEO', 'Content Optimization', 'Link Building', 'Analytics'],
	'Brand Manager': ['Brand Strategy', 'Campaign Planning', 'Audience Insights', 'Creative Review', 'Measurement'],
	'Product Manager': ['Strategy', 'Roadmap', 'User Research', 'Analytics', 'Leadership'],
	'Associate Product Manager': ['Problem Discovery', 'Prioritization', 'Roadmap Basics', 'Stakeholder Management'],
	'Technical PM': ['Technical Trade-offs', 'System Thinking', 'Execution Planning', 'Cross-team Alignment'],
	'Data Scientist': ['Statistics', 'ML Algorithms', 'Feature Engineering', 'Modeling'],
	'ML Engineer': ['Model Deployment', 'MLOps', 'Feature Pipelines', 'Monitoring', 'Optimization'],
	'Business Analyst': ['Requirements Gathering', 'Process Mapping', 'Stakeholder Communication', 'Data Insights'],
	'Product Designer': ['User Research', 'Wireframing', 'Prototyping', 'Design Systems'],
	'UX Designer': ['User Flows', 'Usability Testing', 'Information Architecture', 'Interaction Design'],
	'UI Designer': ['Visual Hierarchy', 'Component Design', 'Accessibility', 'Design Consistency'],
	'HR Generalist': ['Recruitment', 'Employee Relations', 'Policy', 'Development'],
	'Talent Acquisition Specialist': ['Sourcing Strategy', 'Interviewing', 'Candidate Experience', 'Offer Management'],
	'HR Business Partner': ['Org Planning', 'Performance Management', 'Coaching', 'Change Management'],
	'Strategy Consultant': ['Problem Solving', 'Analysis', 'Business Model', 'Case Studies'],
	'Business Consultant': ['Client Discovery', 'Process Improvement', 'Business Diagnostics', 'Recommendations'],
	'Operations Consultant': ['Operational Efficiency', 'SOP Design', 'KPI Tracking', 'Implementation Planning'],
	'Account Executive': ['Negotiation', 'Deal Closing', 'Pipeline', 'Relationship Building'],
	'Sales Development Representative': ['Prospecting', 'Discovery Calls', 'Qualification', 'Objection Handling'],
	'Sales Manager': ['Coaching', 'Forecasting', 'Pipeline Review', 'Team Performance'],
	'Operations Analyst': ['Process Analysis', 'Root Cause Analysis', 'Metrics', 'Reporting'],
	'Program Manager': ['Planning', 'Risk Management', 'Cross-functional Coordination', 'Execution'],
	'Business Operations Manager': ['Operational Strategy', 'Resource Planning', 'Workflow Optimization', 'KPIs'],
}

export const DOMAIN_FOCUS_AREAS_MAP: Record<string, string[]> = {
	Technology: ['Problem Solving', 'System Thinking', 'Communication', 'Execution'],
	Finance: ['Analytical Thinking', 'Risk Awareness', 'Decision Quality', 'Communication'],
	Marketing: ['Strategy', 'Experimentation', 'Customer Insight', 'Communication'],
	'Product Management': ['Prioritization', 'User Focus', 'Execution', 'Stakeholder Management'],
	'Data Science': ['Analytical Rigor', 'Model Thinking', 'Communication', 'Business Impact'],
	Design: ['User Empathy', 'Design Rationale', 'Iteration', 'Communication'],
	HR: ['People Judgment', 'Policy Awareness', 'Conflict Resolution', 'Communication'],
	Consulting: ['Structured Thinking', 'Hypothesis Building', 'Trade-off Analysis', 'Executive Communication'],
	Sales: ['Discovery', 'Persuasion', 'Pipeline Discipline', 'Relationship Building'],
	Operations: ['Process Design', 'Execution', 'Measurement', 'Stakeholder Alignment'],
}

export function getFocusAreasForRole(role: string, domain?: string): string[] {
	if (ROLE_FOCUS_AREAS_MAP[role]) {
		return ROLE_FOCUS_AREAS_MAP[role]
	}

	if (domain && DOMAIN_FOCUS_AREAS_MAP[domain]) {
		return DOMAIN_FOCUS_AREAS_MAP[domain]
	}

	return ['General', 'Problem Solving', 'Communication']
}
