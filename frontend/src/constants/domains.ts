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
	'Growth Marketer': ['Experimentation', 'Metrics', 'Customer Acquisition', 'Retention'],
	'Product Manager': ['Strategy', 'Roadmap', 'User Research', 'Analytics', 'Leadership'],
	'Data Scientist': ['Statistics', 'ML Algorithms', 'Feature Engineering', 'Modeling'],
	'Product Designer': ['User Research', 'Wireframing', 'Prototyping', 'Design Systems'],
	'HR Generalist': ['Recruitment', 'Employee Relations', 'Policy', 'Development'],
	'Strategy Consultant': ['Problem Solving', 'Analysis', 'Business Model', 'Case Studies'],
	'Account Executive': ['Negotiation', 'Deal Closing', 'Pipeline', 'Relationship Building'],
}

export function getFocusAreasForRole(role: string): string[] {
	return ROLE_FOCUS_AREAS_MAP[role] ?? ['General', 'Technical Skills', 'Communication']
}
