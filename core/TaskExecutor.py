from typing import Any, Dict
import logging
from exceptions import TaskExecutionError

class TaskExecutor:
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
    def execute_task(self, task: 'Task') -> Dict[str, Any]:
        if not task:
            raise ValueError("Task cannot be None")
            
        try:
            self.logger.info(f"Executing task: {task.id}")
            result = task.run()
            self.logger.info(f"Task {task.id} completed successfully")
            return result
        except Exception as e:
            self.logger.error(f"Task execution failed: {str(e)}", exc_info=True)
            raise TaskExecutionError(f"Failed to execute task: {str(e)}") from e