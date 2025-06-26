import React from 'react';
import { Container, Card, Alert, Button, Group, Text, Collapse, Code } from '@mantine/core';
import { IconAlertTriangle, IconRefresh, IconReload } from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';

const ErrorFallback = ({ error, errorInfo, onReset }) => {
  const [opened, { toggle }] = useDisclosure(false);

  return (
    <Container size="sm" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
      <Card shadow="md" padding="lg" radius="md" w="100%">
        <Alert
          icon={<IconAlertTriangle size={20} />}
          title="Something went wrong"
          color="red"
          variant="light"
          mb="md"
        >
          <Text size="sm" c="dimmed">
            We encountered an unexpected error while loading the visualization. 
            Please try refreshing the page or selecting a different location.
          </Text>
        </Alert>
        
        <Group justify="center" mt="md">
          <Button
            leftSection={<IconRefresh size={16} />}
            onClick={() => window.location.reload()}
            variant="filled"
          >
            Refresh Page
          </Button>
          <Button
            leftSection={<IconReload size={16} />}
            onClick={onReset}
            variant="light"
          >
            Try Again
          </Button>
        </Group>
        
        {process.env.NODE_ENV === 'development' && error && (
          <>
            <Button
              variant="subtle"
              size="xs"
              onClick={toggle}
              mt="md"
              fullWidth
            >
              {opened ? 'Hide' : 'Show'} Error Details (Development)
            </Button>
            <Collapse in={opened}>
              <Code block mt="xs" c="red">
                {error.toString()}
                {errorInfo?.componentStack}
              </Code>
            </Collapse>
          </>
        )}
      </Card>
    </Container>
  );
};

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onReset={() => {
            this.setState({ hasError: false, error: null, errorInfo: null });
            if (this.props.onReset) {
              this.props.onReset();
            }
          }}
        />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;